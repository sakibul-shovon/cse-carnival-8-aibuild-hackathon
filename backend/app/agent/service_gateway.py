"""Production gateway backed by the shared CampusOS domain services."""

from collections.abc import Callable
from datetime import date as Date
from typing import TypeVar

from sqlalchemy.orm import Session

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
from app.schemas.room import BookingCreate, RoomType
from app.services import domain
from app.services.errors import ServiceError

from .gateway import (
    AgentGatewayError,
    BookRoomCommand,
    CancelBookingCommand,
    CancelEventRegistrationCommand,
    RegisterForEventCommand,
)


ResultT = TypeVar("ResultT")


class ServiceCampusDataGateway:
    """Request-scoped adapter over the synchronous SQLAlchemy service layer."""

    def __init__(self, session: Session, user_id: str) -> None:
        self._session = session
        self._user_id = user_id

    @staticmethod
    def _translate(operation: Callable[[], ResultT]) -> ResultT:
        try:
            return operation()
        except ServiceError as exc:
            try:
                code = ErrorCode(exc.code)
            except ValueError:
                code = ErrorCode.CONFLICT
            raise AgentGatewayError(code, exc.message, exc.details) from exc

    def get_current_user(self) -> UserResponse:
        return self._translate(
            lambda: domain.get_current_user(self._session, self._user_id)
        )

    def get_my_schedules(
        self, day: Weekday | None = None
    ) -> list[ScheduleResponse]:
        def operation() -> list[ScheduleResponse]:
            items = domain.my_schedules(self._session, self._user_id)
            return [item for item in items if day is None or item.day == day]

        return self._translate(operation)

    def get_my_assignments(
        self,
        due_from: Date | None = None,
        due_to: Date | None = None,
    ) -> list[AssignmentResponse]:
        def operation() -> list[AssignmentResponse]:
            items = domain.my_assignments(self._session, self._user_id)
            if due_from is not None:
                items = [item for item in items if item.deadline >= due_from]
            if due_to is not None:
                items = [item for item in items if item.deadline <= due_to]
            return items

        return self._translate(operation)

    def get_active_announcements(
        self,
        on_date: Date,
        priority: AnnouncementPriority | None = None,
    ) -> list[AnnouncementResponse]:
        def operation() -> list[AnnouncementResponse]:
            items = domain.my_announcements(self._session, on_date)
            return [
                item for item in items if priority is None or item.priority == priority
            ]

        return self._translate(operation)

    def get_relevant_events(self, on_date: Date) -> list[EventResponse]:
        return self._translate(lambda: domain.my_events(self._session, on_date))

    def list_rooms(
        self,
        room_type: RoomType | None = None,
        min_capacity: int | None = None,
        equipment: tuple[str, ...] = (),
    ) -> list[RoomResponse]:
        return self._translate(
            lambda: domain.list_rooms(
                self._session,
                room_type.value if room_type is not None else None,
                "available",
                min_capacity,
                list(equipment),
            )
        )

    def find_available_rooms(
        self, query: RoomAvailabilityQuery
    ) -> list[RoomResponse]:
        return self._translate(lambda: domain.available_rooms(self._session, query))

    def book_room(self, command: BookRoomCommand) -> BookingResponse:
        def operation() -> BookingResponse:
            current_user = domain.get_current_user(self._session, self._user_id)
            payload = BookingCreate(
                booked_by=current_user.name,
                date=command.date,
                start_time=command.start_time,
                end_time=command.end_time,
                purpose=command.purpose,
            )
            return domain.book_room(
                self._session,
                command.room_id,
                payload,
                self._user_id,
                command.idempotency_key,
            )

        return self._translate(operation)

    def cancel_my_booking(self, command: CancelBookingCommand) -> DeleteResponse:
        return self._translate(
            lambda: domain.cancel_booking(
                self._session,
                command.room_id,
                command.booking_id,
                self._user_id,
            )
        )

    def register_for_event(
        self, command: RegisterForEventCommand
    ) -> RegistrationResponse:
        return self._translate(
            lambda: domain.register_for_event(
                self._session,
                command.event_id,
                self._user_id,
                command.idempotency_key,
            )
        )

    def cancel_my_event_registration(
        self, command: CancelEventRegistrationCommand
    ) -> DeleteResponse:
        def operation() -> DeleteResponse:
            current_user = domain.get_current_user(self._session, self._user_id)
            return domain.cancel_registration(
                self._session,
                command.event_id,
                self._user_id,
                current_user.student_id,
            )

        return self._translate(operation)
