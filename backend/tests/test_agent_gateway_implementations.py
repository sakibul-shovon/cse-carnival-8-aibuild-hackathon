import json
import inspect
from datetime import date
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config

from app.agent import CampusDataGateway, FakeCampusDataGateway, ServiceCampusDataGateway
from app.agent import tools as tools_module
from app.agent.gateway import (
    AgentGatewayError,
    BookRoomCommand,
    CancelBookingCommand,
    CancelEventRegistrationCommand,
    RegisterForEventCommand,
)
from app.db.seed import import_seed_data
from app.db.session import create_engine_and_session_factory, session_scope
from app.schemas import (
    AnnouncementResponse,
    AssignmentResponse,
    EventResponse,
    RoomAvailabilityQuery,
    RoomResponse,
    ScheduleResponse,
    UserResponse,
)
from app.schemas.common import ErrorCode


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def _load(filename, model):
    records = json.loads((REPOSITORY_ROOT / "data" / filename).read_text())
    return [model.model_validate(item) for item in records]


@pytest.fixture
def fake_gateway():
    return FakeCampusDataGateway(
        user=_load("users.json", UserResponse)[0],
        schedules=_load("schedules.json", ScheduleResponse),
        assignments=_load("assignments.json", AssignmentResponse),
        announcements=_load("announcements.json", AnnouncementResponse),
        events=_load("events.json", EventResponse),
        rooms=_load("rooms.json", RoomResponse),
    )


@pytest.fixture
def service_gateway(tmp_path: Path):
    database_url = f"sqlite:///{(tmp_path / 'gateway.db').as_posix()}"
    config = Config(str(REPOSITORY_ROOT / "backend" / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(config, "head")
    engine, factory = create_engine_and_session_factory(database_url)
    with session_scope(factory) as session:
        import_seed_data(session)
    try:
        with session_scope(factory) as session:
            yield ServiceCampusDataGateway(session, "usr-001")
    finally:
        engine.dispose()


@pytest.mark.parametrize("gateway_fixture", ["fake_gateway", "service_gateway"])
def test_implementations_satisfy_protocol(request, gateway_fixture):
    gateway = request.getfixturevalue(gateway_fixture)
    assert isinstance(gateway, CampusDataGateway)


@pytest.mark.parametrize("gateway_fixture", ["fake_gateway", "service_gateway"])
def test_gateways_return_personalized_live_reads(request, gateway_fixture):
    gateway = request.getfixturevalue(gateway_fixture)
    assert len(gateway.get_my_schedules()) == 24
    assert len(gateway.get_my_schedules("Wednesday")) == 5
    assert len(
        gateway.get_my_assignments(date(2026, 9, 7), date(2026, 9, 11))
    ) == 4
    assert len(gateway.get_active_announcements(date(2026, 9, 7))) == 6
    assert len(gateway.get_relevant_events(date(2026, 9, 8))) == 4


@pytest.mark.parametrize("gateway_fixture", ["fake_gateway", "service_gateway"])
def test_gateways_apply_room_filters_and_schedule_conflicts(request, gateway_fixture):
    gateway = request.getfixturevalue(gateway_fixture)
    labs = gateway.list_rooms(min_capacity=30, equipment=("projector",))
    assert {room.id for room in labs if room.type == "lab"} == {
        "room-008",
        "room-009",
        "room-012",
        "room-013",
        "room-014",
        "room-015",
    }

    # 2026-09-06 is Sunday; 7A05 has a recurring class from 08:00 to 08:50.
    available = gateway.find_available_rooms(
        RoomAvailabilityQuery(
            date=date(2026, 9, 6),
            start_time="08:20",
            end_time="08:30",
        )
    )
    assert "room-005" not in {room.id for room in available}


@pytest.mark.parametrize("gateway_fixture", ["fake_gateway", "service_gateway"])
def test_gateways_book_idempotently_and_update_availability(request, gateway_fixture):
    gateway = request.getfixturevalue(gateway_fixture)
    command = BookRoomCommand(
        room_id="room-002",
        date=date(2026, 9, 5),
        start_time="15:00",
        end_time="17:00",
        purpose="Group study",
        idempotency_key="gateway-booking-001",
    )
    booking = gateway.book_room(command)
    assert gateway.book_room(command) == booking
    assert booking.booked_by == "Sakibul Hassan"

    available = gateway.find_available_rooms(
        RoomAvailabilityQuery(
            date=date(2026, 9, 5),
            start_time="15:30",
            end_time="16:00",
        )
    )
    assert "room-002" not in {room.id for room in available}
    assert gateway.cancel_my_booking(
        CancelBookingCommand(room_id="room-002", booking_id=booking.booking_id)
    ).deleted


@pytest.mark.parametrize("gateway_fixture", ["fake_gateway", "service_gateway"])
def test_gateways_register_and_cancel_current_user(request, gateway_fixture):
    gateway = request.getfixturevalue(gateway_fixture)
    command = RegisterForEventCommand(
        event_id="evt-007",
        idempotency_key="gateway-registration-001",
    )
    registration = gateway.register_for_event(command)
    assert gateway.register_for_event(command) == registration
    assert registration.student_id == "20-40532"
    assert gateway.cancel_my_event_registration(
        CancelEventRegistrationCommand(event_id="evt-007")
    ).deleted


@pytest.mark.parametrize("gateway_fixture", ["fake_gateway", "service_gateway"])
def test_gateways_normalize_expected_service_failures(request, gateway_fixture):
    gateway = request.getfixturevalue(gateway_fixture)
    with pytest.raises(AgentGatewayError) as error:
        gateway.register_for_event(
            RegisterForEventCommand(
                event_id="evt-002",
                idempotency_key="already-registered",
            )
        )
    assert error.value.code is ErrorCode.ALREADY_REGISTERED


def test_agent_tools_depend_on_gateway_not_database_or_domain_services(fake_gateway):
    source = inspect.getsource(tools_module)
    assert "sqlalchemy" not in source
    assert "app.services" not in source

    output, summary = tools_module.CampusTools(fake_gateway).execute(
        "get_my_schedules", {"day": "Wednesday"}, "read-001"
    )
    assert len(json.loads(output)) == 5
    assert summary == "Returned 5 result(s)"
