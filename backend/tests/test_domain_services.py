from datetime import date
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from pydantic import ValidationError
from sqlalchemy import func, select

from app.db.models import Booking, Event, Registration, User
from app.db.seed import import_seed_data
from app.db.session import create_engine_and_session_factory, session_scope
from app.schemas import AnnouncementCreate, AnnouncementUpdate, EventUpdate, RoomCreate, ScheduleCreate, ScheduleUpdate
from app.schemas.room import BookingCreate, RoomAvailabilityQuery
from app.services.domain import (
    available_rooms, book_room, cancel_booking, cancel_registration, create_resource,
    create_room, delete_resource, get_current_user, get_resource, list_resources, my_assignments,
    my_schedules, register_for_event, update_event, update_resource,
)
from app.services.errors import AlreadyRegisteredError, ConflictError, EventFullError, ForbiddenError, NotFoundError, RoomUnavailableError


@pytest.fixture
def seeded_db(tmp_path: Path):
    url = f"sqlite:///{(tmp_path / 'services.db').as_posix()}"
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")
    engine, factory = create_engine_and_session_factory(url)
    with session_scope(factory) as session:
        import_seed_data(session)
    try:
        yield factory
    finally:
        engine.dispose()


def test_crud_create_update_delete_and_complete_patch_validation(seeded_db):
    with session_scope(seeded_db) as session:
        created = create_resource(session, "announcement", AnnouncementCreate(
            title="Test", body="Body", date=date(2026, 9, 4), priority="low", posted_by="Admin", expires=date(2026, 9, 5)))
        updated = update_resource(session, "announcement", created.id, AnnouncementUpdate(title="Changed"))
        assert updated.title == "Changed"
        assert delete_resource(session, "announcement", created.id).deleted
        assert len(list_resources(session, "announcement")) == 8
        with pytest.raises(NotFoundError):
            get_resource(session, "announcement", created.id)

        schedule = create_resource(session, "schedule", ScheduleCreate(course="CSE 9999", title="Test", day="Sunday",
            start_time="18:00", end_time="19:00", room="7A01", instructor="Teacher", section="Z"))
        with pytest.raises(ValidationError):
            update_resource(session, "schedule", schedule.id, ScheduleUpdate(start_time="20:00"))


def test_room_equipment_is_normalized_and_case_insensitive_for_search(seeded_db):
    with session_scope(seeded_db) as session:
        room = create_room(session, RoomCreate(room_number="X100", type="lab", capacity=12,
            equipment=["GPU Cluster"], floor=1, status="available"))
        results = available_rooms(session, RoomAvailabilityQuery(date=date(2026, 9, 5), start_time="08:00", end_time="09:00", equipment=["gpu cluster"]))
        assert room.id in {item.id for item in results}


def test_availability_uses_half_open_intervals_and_recurring_schedule(seeded_db):
    with session_scope(seeded_db) as session:
        # 2026-09-06 is Sunday; 7A05 has class 08:00-08:50.
        blocked = available_rooms(session, RoomAvailabilityQuery(date=date(2026, 9, 6), start_time="08:20", end_time="08:30"))
        assert "room-005" not in {r.id for r in blocked}
        boundary = available_rooms(session, RoomAvailabilityQuery(date=date(2026, 9, 6), start_time="08:50", end_time="09:00"))
        assert "room-005" in {r.id for r in boundary}
        # Existing booking in 7B04 ends at 16:00, so a booking starting then is valid.
        boundary = available_rooms(session, RoomAvailabilityQuery(date=date(2026, 9, 5), start_time="16:00", end_time="17:00"))
        assert "room-011" in {r.id for r in boundary}


def test_booking_is_atomic_idempotent_and_uses_trusted_identity(seeded_db):
    payload = BookingCreate(booked_by="Spoofed", date=date(2026, 9, 5), start_time="09:00", end_time="10:00", purpose="Study")
    with session_scope(seeded_db) as session:
        first = book_room(session, "room-001", payload, "usr-001", "booking-key")
        again = book_room(session, "room-001", payload, "usr-001", "booking-key")
        assert first == again
        assert first.booked_by == "Sakibul Hassan"
        assert session.scalar(select(func.count()).select_from(Booking).where(Booking.id == first.booking_id)) == 1
        with pytest.raises(RoomUnavailableError):
            book_room(session, "room-001", payload, "usr-001", "other-key")


def test_booking_cancellation_enforces_ownership(seeded_db):
    payload = BookingCreate(booked_by="Demo", date=date(2026, 9, 5), start_time="09:00", end_time="10:00", purpose="Study")
    with session_scope(seeded_db) as session:
        booking = book_room(session, "room-001", payload, "usr-001", "owned")
        session.add(User(id="usr-other", student_id="99-99999", name="Other", department="CSE", role="student")); session.flush()
        with pytest.raises(ForbiddenError): cancel_booking(session, "room-001", booking.booking_id, "usr-other")
        assert cancel_booking(session, "room-001", booking.booking_id, "usr-001").deleted


def test_event_registration_duplicate_capacity_idempotency_and_cancel(seeded_db):
    with session_scope(seeded_db) as session:
        registration = register_for_event(session, "evt-007", "usr-001", "event-key")
        assert register_for_event(session, "evt-007", "usr-001", "event-key") == registration
        assert session.get(Event, "evt-007").registered == 19
        with pytest.raises(AlreadyRegisteredError): register_for_event(session, "evt-007", "usr-001", "different-key")
        assert cancel_registration(session, "evt-007", "usr-001", "20-40532").deleted
        assert session.get(Event, "evt-007").registered == 18
        with pytest.raises(EventFullError): register_for_event(session, "evt-006", "usr-001", "full-key")


def test_registration_cancellation_rejects_another_student(seeded_db):
    with session_scope(seeded_db) as session:
        with pytest.raises(ForbiddenError): cancel_registration(session, "evt-001", "usr-001", "20-40511")


def test_personalized_queries_use_configured_user_and_enrollments(seeded_db):
    with session_scope(seeded_db) as session:
        user = get_current_user(session, "usr-001")
        assert user.student_id == "20-40532"
        assert len(my_schedules(session, user.id)) == 24
        assert len(my_assignments(session, user.id)) == 8


def test_event_capacity_cannot_be_patched_below_registered(seeded_db):
    with session_scope(seeded_db) as session:
        with pytest.raises(ConflictError) as error:
            update_event(session, "evt-001", EventUpdate(capacity=46))
        assert getattr(error.value, "code", None) == "CONFLICT"
