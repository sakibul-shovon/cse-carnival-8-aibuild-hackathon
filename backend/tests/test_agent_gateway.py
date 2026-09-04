import inspect

import pytest
from pydantic import ValidationError

from app.agent.gateway import (
    AgentGatewayError,
    BookRoomCommand,
    CampusDataGateway,
)
from app.schemas.common import ErrorCode


class StructurallyCompleteGateway:
    """The runtime protocol checks this integration surface by method name."""

    def get_current_user(self): ...
    def get_my_schedules(self, day=None): ...
    def get_my_assignments(self, due_from=None, due_to=None): ...
    def get_active_announcements(self, on_date, priority=None): ...
    def get_relevant_events(self, on_date): ...
    def list_rooms(self, room_type=None, min_capacity=None, equipment=()): ...
    def find_available_rooms(self, query): ...
    def book_room(self, command): ...
    def cancel_my_booking(self, command): ...
    def register_for_event(self, command): ...
    def cancel_my_event_registration(self, command): ...


def test_gateway_is_a_runtime_checkable_integration_contract():
    assert isinstance(StructurallyCompleteGateway(), CampusDataGateway)


def test_gateway_operations_do_not_accept_an_arbitrary_user_id():
    for operation_name in (
        "get_my_schedules",
        "get_my_assignments",
        "book_room",
        "cancel_my_booking",
        "register_for_event",
        "cancel_my_event_registration",
    ):
        parameters = inspect.signature(
            getattr(CampusDataGateway, operation_name)
        ).parameters
        assert "user_id" not in parameters
        assert "student_id" not in parameters


def test_booking_command_rejects_identity_injection():
    with pytest.raises(ValidationError):
        BookRoomCommand.model_validate(
            {
                "room_id": "room-002",
                "date": "2026-09-05",
                "start_time": "15:00",
                "end_time": "17:00",
                "purpose": "Group study",
                "idempotency_key": "agent-call-001",
                "booked_by": "Another Student",
            }
        )


def test_booking_command_rejects_invalid_interval():
    with pytest.raises(ValidationError):
        BookRoomCommand.model_validate(
            {
                "room_id": "room-002",
                "date": "2026-09-05",
                "start_time": "17:00",
                "end_time": "15:00",
                "purpose": "Group study",
                "idempotency_key": "agent-call-002",
            }
        )


def test_gateway_error_has_stable_safe_fields():
    error = AgentGatewayError(
        ErrorCode.ROOM_UNAVAILABLE,
        "The room is unavailable.",
        {"room_id": "room-002"},
    )

    assert error.code is ErrorCode.ROOM_UNAVAILABLE
    assert error.message == "The room is unavailable."
    assert error.details == {"room_id": "room-002"}
    assert str(error) == "The room is unavailable."
