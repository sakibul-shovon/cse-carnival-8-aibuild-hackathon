"""Stable boundary between the AI agent and CampusOS domain services.

The agent must not know about SQLAlchemy sessions, database models, or arbitrary
user IDs. A gateway implementation is created for the trusted current user and
delegates every operation to the shared domain services.

Step M6.1 defines this contract only. Later steps provide an in-memory fake for
deterministic agent tests and a service-backed implementation for production.
"""

from datetime import date as Date
from typing import Annotated, Any, Protocol, runtime_checkable

from pydantic import Field, StringConstraints, model_validator

from app.schemas import (
    AnnouncementResponse,
    AssignmentResponse,
    BookingResponse,
    DeleteResponse,
    EventResponse,
    RegistrationResponse,
    RoomAvailabilityQuery,
    RoomResponse,
    ScheduleResponse,
    UserResponse,
)
from app.schemas.announcement import AnnouncementPriority
from app.schemas.common import ErrorCode, NonEmptyStr, StrictModel, TimeHHMM, Weekday
from app.schemas.event import EventId
from app.schemas.room import BookingId, RoomId, RoomType


IdempotencyKey = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=200),
]


class BookRoomCommand(StrictModel):
    """Agent-safe booking command.

    Identity is deliberately absent. The gateway obtains ``booked_by`` and the
    owning user ID from its trusted request context.
    """

    room_id: RoomId
    date: Date
    start_time: TimeHHMM
    end_time: TimeHHMM
    purpose: NonEmptyStr
    idempotency_key: IdempotencyKey

    @model_validator(mode="after")
    def validate_time_range(self) -> "BookRoomCommand":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be later than start_time")
        return self


class CancelBookingCommand(StrictModel):
    room_id: RoomId
    booking_id: BookingId


class RegisterForEventCommand(StrictModel):
    event_id: EventId
    idempotency_key: IdempotencyKey


class CancelEventRegistrationCommand(StrictModel):
    event_id: EventId


class AgentGatewayError(Exception):
    """Provider-neutral failure returned by a gateway implementation."""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = dict(details) if details else None


@runtime_checkable
class CampusDataGateway(Protocol):
    """Current-user data and command surface available to the agent.

    Implementations raise :class:`AgentGatewayError` for expected failures. The
    protocol is synchronous because the MVP currently uses synchronous SQLAlchemy
    sessions and FastAPI handlers. An async adapter can be introduced later
    without exposing database details to tools.
    """

    def get_current_user(self) -> UserResponse:
        """Return the trusted current user configured by the backend."""
        ...

    def get_my_schedules(
        self,
        day: Weekday | None = None,
    ) -> list[ScheduleResponse]:
        """Return live schedules relevant to the current user's enrollments."""
        ...

    def get_my_assignments(
        self,
        due_from: Date | None = None,
        due_to: Date | None = None,
    ) -> list[AssignmentResponse]:
        """Return live relevant assignments within inclusive deadline bounds."""
        ...

    def get_active_announcements(
        self,
        on_date: Date,
        priority: AnnouncementPriority | None = None,
    ) -> list[AnnouncementResponse]:
        """Return active campus announcements, optionally filtered by priority."""
        ...

    def get_relevant_events(self, on_date: Date) -> list[EventResponse]:
        """Return discoverable events that have not ended before ``on_date``."""
        ...

    def list_rooms(
        self,
        room_type: RoomType | None = None,
        min_capacity: Annotated[int, Field(gt=0)] | None = None,
        equipment: tuple[str, ...] = (),
    ) -> list[RoomResponse]:
        """Return operational rooms without applying a time interval."""
        ...

    def find_available_rooms(
        self,
        query: RoomAvailabilityQuery,
    ) -> list[RoomResponse]:
        """Return rooms free from dated-booking and recurring-class conflicts."""
        ...

    def book_room(self, command: BookRoomCommand) -> BookingResponse:
        """Atomically book a room for the trusted current user."""
        ...

    def cancel_my_booking(self, command: CancelBookingCommand) -> DeleteResponse:
        """Cancel a booking only when backend authorization permits it."""
        ...

    def register_for_event(
        self,
        command: RegisterForEventCommand,
    ) -> RegistrationResponse:
        """Atomically register the trusted current user for an event."""
        ...

    def cancel_my_event_registration(
        self,
        command: CancelEventRegistrationCommand,
    ) -> DeleteResponse:
        """Cancel only the trusted current user's registration."""
        ...
