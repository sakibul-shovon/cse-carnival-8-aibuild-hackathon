"""Deterministic in-memory gateway for agent development and tests."""

from datetime import date as Date
from threading import RLock

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
from app.schemas.common import ErrorCode, Weekday
from app.schemas.event import EventStatus
from app.schemas.room import RoomStatus, RoomType
from app.services.relevance import (
    relevant_announcements,
    relevant_assignments,
    relevant_events,
    relevant_schedules,
)

from .gateway import (
    AgentGatewayError,
    BookRoomCommand,
    CancelBookingCommand,
    CancelEventRegistrationCommand,
    RegisterForEventCommand,
)


class FakeCampusDataGateway:
    """Mutable fake with the same observable rules as the service gateway.

    Input models and returned models are deep-copied so a test cannot accidentally
    mutate gateway state without going through a command method.
    """

    def __init__(
        self,
        *,
        user: UserResponse,
        schedules: list[ScheduleResponse] | None = None,
        assignments: list[AssignmentResponse] | None = None,
        announcements: list[AnnouncementResponse] | None = None,
        events: list[EventResponse] | None = None,
        rooms: list[RoomResponse] | None = None,
    ) -> None:
        self._user = user.model_copy(deep=True)
        self._schedules = self._copy(schedules or [])
        self._assignments = self._copy(assignments or [])
        self._announcements = self._copy(announcements or [])
        self._events = {item.id: item.model_copy(deep=True) for item in events or []}
        self._rooms = {item.id: item.model_copy(deep=True) for item in rooms or []}
        self._owned_booking_ids: set[str] = set()
        self._booking_results: dict[tuple[str, str], BookingResponse] = {}
        self._registration_results: dict[
            tuple[str, str], RegistrationResponse
        ] = {}
        self._booking_sequence = 0
        self._lock = RLock()

    @staticmethod
    def _copy(items):
        return [item.model_copy(deep=True) for item in items]

    @staticmethod
    def _overlaps(
        existing_start: str,
        existing_end: str,
        requested_start: str,
        requested_end: str,
    ) -> bool:
        return existing_start < requested_end and existing_end > requested_start

    def get_current_user(self) -> UserResponse:
        return self._user.model_copy(deep=True)

    def get_my_schedules(
        self, day: Weekday | None = None
    ) -> list[ScheduleResponse]:
        items = relevant_schedules(self._user, self._schedules)
        if day is not None:
            items = [item for item in items if item.day == day]
        return self._copy(items)

    def get_my_assignments(
        self,
        due_from: Date | None = None,
        due_to: Date | None = None,
    ) -> list[AssignmentResponse]:
        items = relevant_assignments(self._user, self._assignments)
        if due_from is not None:
            items = [item for item in items if item.deadline >= due_from]
        if due_to is not None:
            items = [item for item in items if item.deadline <= due_to]
        return self._copy(items)

    def get_active_announcements(
        self,
        on_date: Date,
        priority: AnnouncementPriority | None = None,
    ) -> list[AnnouncementResponse]:
        items = relevant_announcements(self._announcements, on_date)
        if priority is not None:
            items = [item for item in items if item.priority == priority]
        return self._copy(items)

    def get_relevant_events(self, on_date: Date) -> list[EventResponse]:
        return self._copy(relevant_events(list(self._events.values()), on_date))

    def list_rooms(
        self,
        room_type: RoomType | None = None,
        min_capacity: int | None = None,
        equipment: tuple[str, ...] = (),
    ) -> list[RoomResponse]:
        required = {item.casefold() for item in equipment}
        items = []
        for room in self._rooms.values():
            if room.status != RoomStatus.AVAILABLE:
                continue
            if room_type is not None and room.type != room_type:
                continue
            if min_capacity is not None and room.capacity < min_capacity:
                continue
            if not required.issubset({item.casefold() for item in room.equipment}):
                continue
            items.append(room)
        return self._copy(items)

    def _room_conflict(
        self,
        room: RoomResponse,
        target_date: Date,
        start_time: str,
        end_time: str,
    ) -> str | None:
        for booking in room.bookings:
            if booking.date == target_date and self._overlaps(
                booking.start_time, booking.end_time, start_time, end_time
            ):
                return booking.booking_id

        weekday = target_date.strftime("%A")
        for schedule in self._schedules:
            if (
                schedule.room == room.room_number
                and schedule.day == weekday
                and self._overlaps(
                    schedule.start_time, schedule.end_time, start_time, end_time
                )
            ):
                return schedule.id
        return None

    def find_available_rooms(
        self, query: RoomAvailabilityQuery
    ) -> list[RoomResponse]:
        candidates = self.list_rooms(
            query.room_type,
            query.capacity,
            tuple(query.equipment),
        )
        return [
            room
            for room in candidates
            if self._room_conflict(
                room, query.date, query.start_time, query.end_time
            )
            is None
        ]

    def book_room(self, command: BookRoomCommand) -> BookingResponse:
        with self._lock:
            operation_key = (command.room_id, command.idempotency_key)
            prior = self._booking_results.get(operation_key)
            if prior is not None:
                return prior.model_copy(deep=True)

            room = self._rooms.get(command.room_id)
            if room is None:
                raise AgentGatewayError(
                    ErrorCode.NOT_FOUND,
                    f"Room {command.room_id} was not found.",
                    {"room_id": command.room_id},
                )
            conflict = self._room_conflict(
                room, command.date, command.start_time, command.end_time
            )
            if room.status != RoomStatus.AVAILABLE or conflict is not None:
                raise AgentGatewayError(
                    ErrorCode.ROOM_UNAVAILABLE,
                    f"Room {room.room_number} is unavailable.",
                    {"room_id": room.id, "conflicting_id": conflict},
                )

            self._booking_sequence += 1
            booking = BookingResponse(
                booking_id=f"bk-fake-{self._booking_sequence:03d}",
                booked_by=self._user.name,
                date=command.date,
                start_time=command.start_time,
                end_time=command.end_time,
                purpose=command.purpose,
            )
            room.bookings.append(booking)
            self._owned_booking_ids.add(booking.booking_id)
            self._booking_results[operation_key] = booking
            return booking.model_copy(deep=True)

    def cancel_my_booking(self, command: CancelBookingCommand) -> DeleteResponse:
        with self._lock:
            room = self._rooms.get(command.room_id)
            if room is None:
                raise AgentGatewayError(
                    ErrorCode.NOT_FOUND,
                    f"Room {command.room_id} was not found.",
                    {"room_id": command.room_id},
                )
            booking = next(
                (
                    item
                    for item in room.bookings
                    if item.booking_id == command.booking_id
                ),
                None,
            )
            if booking is None:
                raise AgentGatewayError(
                    ErrorCode.NOT_FOUND,
                    f"Booking {command.booking_id} was not found.",
                    {"booking_id": command.booking_id},
                )
            if booking.booking_id not in self._owned_booking_ids:
                raise AgentGatewayError(
                    ErrorCode.FORBIDDEN,
                    "Only the booking owner may cancel it.",
                    {"booking_id": booking.booking_id},
                )
            room.bookings.remove(booking)
            self._owned_booking_ids.remove(booking.booking_id)
            return DeleteResponse(id=booking.booking_id)

    def register_for_event(
        self, command: RegisterForEventCommand
    ) -> RegistrationResponse:
        with self._lock:
            operation_key = (command.event_id, command.idempotency_key)
            prior = self._registration_results.get(operation_key)
            if prior is not None:
                return prior.model_copy(deep=True)

            event = self._events.get(command.event_id)
            if event is None:
                raise AgentGatewayError(
                    ErrorCode.NOT_FOUND,
                    f"Event {command.event_id} was not found.",
                    {"event_id": command.event_id},
                )
            if any(
                item.student_id == self._user.student_id
                for item in event.registrations
            ):
                raise AgentGatewayError(
                    ErrorCode.ALREADY_REGISTERED,
                    "The current user is already registered.",
                    {"event_id": event.id},
                )
            if (
                event.status in {EventStatus.CANCELLED, EventStatus.COMPLETED}
                or event.registered >= event.capacity
            ):
                raise AgentGatewayError(
                    ErrorCode.EVENT_FULL,
                    "The event is not accepting registrations.",
                    {"event_id": event.id},
                )

            registration = RegistrationResponse(
                student_id=self._user.student_id,
                name=self._user.name,
            )
            event.registrations.append(registration)
            event.registered += 1
            self._registration_results[operation_key] = registration
            return registration.model_copy(deep=True)

    def cancel_my_event_registration(
        self, command: CancelEventRegistrationCommand
    ) -> DeleteResponse:
        with self._lock:
            event = self._events.get(command.event_id)
            if event is None:
                raise AgentGatewayError(
                    ErrorCode.NOT_FOUND,
                    f"Event {command.event_id} was not found.",
                    {"event_id": command.event_id},
                )
            registration = next(
                (
                    item
                    for item in event.registrations
                    if item.student_id == self._user.student_id
                ),
                None,
            )
            if registration is None:
                raise AgentGatewayError(
                    ErrorCode.NOT_REGISTERED,
                    "The current user is not registered for this event.",
                    {"event_id": event.id},
                )
            event.registrations.remove(registration)
            event.registered -= 1
            return DeleteResponse(id=self._user.student_id)
