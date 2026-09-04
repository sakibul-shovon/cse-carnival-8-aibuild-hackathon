from datetime import date, time
from typing import Any, TypeVar

from pydantic import BaseModel
from sqlalchemy import case, select
from sqlalchemy.orm import Session, selectinload

from app.db.ids import new_id
from app.db.models import (
    Announcement, Assignment, Booking, Enrollment, Event, IdempotencyRecord,
    Registration, Room, RoomEquipment, Schedule, User,
)
from app.schemas import (
    AnnouncementCreate, AnnouncementResponse, AnnouncementUpdate,
    AssignmentCreate, AssignmentResponse, AssignmentUpdate,
    EventCreate, EventResponse, EventUpdate, RoomCreate, RoomResponse, RoomUpdate,
    ScheduleCreate, ScheduleResponse, ScheduleUpdate, UserResponse,
)
from app.schemas.room import BookingCreate, BookingResponse, RoomAvailabilityQuery
from app.schemas.event import EventStatus, RegistrationResponse
from app.schemas.common import DeleteResponse, UserRole

from .errors import (
    AlreadyRegisteredError, ConflictError, EventFullError, ForbiddenError,
    NotFoundError, NotRegisteredError, RoomUnavailableError,
)
from .relevance import relevant_announcements, relevant_assignments, relevant_events, relevant_schedules


ModelT = TypeVar("ModelT")


def _clock(value: str) -> time:
    return time.fromisoformat(value)


def _hhmm(value: time) -> str:
    return value.strftime("%H:%M")


def _get(session: Session, model: type[ModelT], resource_id: str) -> ModelT:
    item = session.get(model, resource_id)
    if item is None:
        raise NotFoundError(f"{model.__name__} {resource_id} was not found", id=resource_id)
    return item


def get_current_user(session: Session, demo_user_id: str) -> UserResponse:
    user = session.scalar(select(User).options(selectinload(User.enrollments)).where(User.id == demo_user_id))
    if user is None:
        raise NotFoundError("Configured demo user was not found", user_id=demo_user_id)
    return UserResponse(id=user.id, student_id=user.student_id, name=user.name, department=user.department,
                        role=user.role, enrollments=[{"course": e.course, "section": e.section} for e in user.enrollments])


def _schedule_response(item: Schedule) -> ScheduleResponse:
    return ScheduleResponse(id=item.id, course=item.course, title=item.title, day=item.day,
                            start_time=_hhmm(item.start_time), end_time=_hhmm(item.end_time), room=item.room,
                            instructor=item.instructor, section=item.section)


def _room_response(item: Room) -> RoomResponse:
    return RoomResponse(id=item.id, room_number=item.room_number, type=item.type, capacity=item.capacity,
                        equipment=[e.name for e in item.equipment], floor=item.floor, status=item.status,
                        bookings=[BookingResponse(booking_id=b.id, booked_by=b.booked_by, date=b.date,
                                                  start_time=_hhmm(b.start_time), end_time=_hhmm(b.end_time),
                                                  purpose=b.purpose) for b in item.bookings])


def _event_response(item: Event) -> EventResponse:
    return EventResponse(id=item.id, name=item.name, description=item.description, date=item.date,
                         start_time=_hhmm(item.start_time), end_time=_hhmm(item.end_time), end_date=item.end_date,
                         venue=item.venue, organizer=item.organizer, capacity=item.capacity, registered=item.registered,
                         status=item.status, registrations=[RegistrationResponse(student_id=r.student_id, name=r.name)
                                                            for r in item.registrations])


def _simple_response(item: Any, schema: type[BaseModel]) -> BaseModel:
    return schema.model_validate(item, from_attributes=True)


RESOURCE_CONFIG = {
    "schedule": (Schedule, ScheduleCreate, ScheduleUpdate, ScheduleResponse, "sch"),
    "announcement": (Announcement, AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse, "ann"),
    "assignment": (Assignment, AssignmentCreate, AssignmentUpdate, AssignmentResponse, "asgn"),
}


def list_resources(session: Session, resource: str, **filters: object) -> list[BaseModel]:
    model, _, _, response, _ = RESOURCE_CONFIG[resource]
    query = select(model)
    for field, value in filters.items():
        if value is not None:
            query = query.where(getattr(model, field) == value)
    if resource == "schedule":
        weekday_order = case(
            {"Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4},
            value=Schedule.day,
            else_=5,
        )
        query = query.order_by(weekday_order, Schedule.start_time, Schedule.id)
    elif resource == "assignment":
        query = query.order_by(Assignment.deadline, Assignment.id)
    else:
        query = query.order_by(model.id)
    return [_schedule_response(row) if resource == "schedule" else _simple_response(row, response)
            for row in session.scalars(query).all()]


def get_resource(session: Session, resource: str, resource_id: str) -> BaseModel:
    model, _, _, response, _ = RESOURCE_CONFIG[resource]
    item = _get(session, model, resource_id)
    return _schedule_response(item) if resource == "schedule" else _simple_response(item, response)


def create_resource(session: Session, resource: str, payload: BaseModel) -> BaseModel:
    model, create_schema, _, _, prefix = RESOURCE_CONFIG[resource]
    validated = create_schema.model_validate(payload)
    data = validated.model_dump()
    if resource == "schedule":
        data.update(start_time=_clock(validated.start_time), end_time=_clock(validated.end_time))
    item = model(id=new_id(prefix), **data)
    session.add(item)
    session.flush()
    return get_resource(session, resource, item.id)


def update_resource(session: Session, resource: str, resource_id: str, patch: BaseModel) -> BaseModel:
    model, create_schema, update_schema, _, _ = RESOURCE_CONFIG[resource]
    item = _get(session, model, resource_id)
    changes = update_schema.model_validate(patch).model_dump(exclude_unset=True)
    current = get_resource(session, resource, resource_id).model_dump(exclude={"id"})
    validated = create_schema.model_validate(current | changes)
    data = validated.model_dump()
    if resource == "schedule":
        data.update(start_time=_clock(validated.start_time), end_time=_clock(validated.end_time))
    for key, value in data.items():
        setattr(item, key, value)
    session.flush()
    return get_resource(session, resource, resource_id)


def delete_resource(session: Session, resource: str, resource_id: str) -> DeleteResponse:
    model = RESOURCE_CONFIG[resource][0]
    session.delete(_get(session, model, resource_id))
    session.flush()
    return DeleteResponse(id=resource_id)


def _load_room(session: Session, room_id: str) -> Room:
    room = session.scalar(select(Room).options(selectinload(Room.equipment), selectinload(Room.bookings)).where(Room.id == room_id))
    if room is None:
        raise NotFoundError(f"Room {room_id} was not found", id=room_id)
    return room


def list_rooms(session: Session, room_type: str | None = None, status: str | None = None,
               min_capacity: int | None = None, equipment: list[str] | None = None) -> list[RoomResponse]:
    query = select(Room).options(selectinload(Room.equipment), selectinload(Room.bookings))
    if room_type: query = query.where(Room.type == room_type)
    if status: query = query.where(Room.status == status)
    if min_capacity is not None: query = query.where(Room.capacity >= min_capacity)
    required = {item.casefold() for item in equipment or []}
    rooms = session.scalars(query.order_by(Room.room_number)).all()
    return [_room_response(r) for r in rooms if required.issubset({e.name.casefold() for e in r.equipment})]


def get_room(session: Session, room_id: str) -> RoomResponse:
    return _room_response(_load_room(session, room_id))


def create_room(session: Session, payload: RoomCreate) -> RoomResponse:
    data = payload.model_dump(exclude={"equipment"})
    data["type"], data["status"] = payload.type.value, payload.status.value
    room = Room(id=new_id("room"), **data, equipment=[RoomEquipment(name=e) for e in payload.equipment])
    session.add(room); session.flush()
    return _room_response(room)


def update_room(session: Session, room_id: str, patch: RoomUpdate) -> RoomResponse:
    room = _load_room(session, room_id)
    merged = _room_response(room).model_dump(exclude={"id", "bookings"}) | patch.model_dump(exclude_unset=True)
    data = RoomCreate.model_validate(merged)
    for field in ("room_number", "capacity", "floor"):
        setattr(room, field, getattr(data, field))
    room.type, room.status = data.type.value, data.status.value
    if "equipment" in patch.model_fields_set:
        for existing in list(room.equipment):
            session.delete(existing)
        session.flush()
        room.equipment = [RoomEquipment(name=e) for e in data.equipment]
    session.flush(); return _room_response(room)


def delete_room(session: Session, room_id: str) -> DeleteResponse:
    session.delete(_load_room(session, room_id)); session.flush(); return DeleteResponse(id=room_id)


def _load_event(session: Session, event_id: str) -> Event:
    event = session.scalar(select(Event).options(selectinload(Event.registrations)).where(Event.id == event_id))
    if event is None: raise NotFoundError(f"Event {event_id} was not found", id=event_id)
    return event


def list_events(session: Session, date_from: date | None = None, date_to: date | None = None,
                status: str | None = None, venue: str | None = None) -> list[EventResponse]:
    query = select(Event).options(selectinload(Event.registrations))
    if date_from: query = query.where(Event.end_date >= date_from)
    if date_to: query = query.where(Event.date <= date_to)
    if status: query = query.where(Event.status == status)
    if venue: query = query.where(Event.venue == venue)
    return [_event_response(e) for e in session.scalars(query.order_by(Event.date, Event.start_time, Event.id)).all()]


def get_event(session: Session, event_id: str) -> EventResponse:
    return _event_response(_load_event(session, event_id))


def create_event(session: Session, payload: EventCreate) -> EventResponse:
    data = payload.model_dump(); data.update(start_time=_clock(payload.start_time), end_time=_clock(payload.end_time), status=payload.status.value)
    event = Event(id=new_id("evt"), registered=0, **data); session.add(event); session.flush(); return _event_response(event)


def update_event(session: Session, event_id: str, patch: EventUpdate) -> EventResponse:
    event = _load_event(session, event_id)
    merged = _event_response(event).model_dump(exclude={"id", "registered", "registrations"}) | patch.model_dump(exclude_unset=True)
    data = EventCreate.model_validate(merged)
    if data.capacity < event.registered: raise ConflictError("Capacity cannot be below registered count", event_id=event_id)
    values = data.model_dump(); values.update(start_time=_clock(data.start_time), end_time=_clock(data.end_time), status=data.status.value)
    for key, value in values.items(): setattr(event, key, value)
    session.flush(); return _event_response(event)


def delete_event(session: Session, event_id: str) -> DeleteResponse:
    session.delete(_load_event(session, event_id)); session.flush(); return DeleteResponse(id=event_id)


def room_is_available(session: Session, room: Room, query: RoomAvailabilityQuery) -> tuple[bool, str | None]:
    start, end = _clock(query.start_time), _clock(query.end_time)
    booking = session.scalar(select(Booking).where(Booking.room_id == room.id, Booking.date == query.date,
                                                    Booking.start_time < end, Booking.end_time > start).limit(1))
    if booking: return False, booking.id
    weekday = query.date.strftime("%A")
    schedule = session.scalar(select(Schedule).where(Schedule.room == room.room_number, Schedule.day == weekday,
                                                      Schedule.start_time < end, Schedule.end_time > start).limit(1))
    return (False, schedule.id) if schedule else (True, None)


def available_rooms(session: Session, query: RoomAvailabilityQuery) -> list[RoomResponse]:
    rooms = session.scalars(select(Room).options(selectinload(Room.equipment), selectinload(Room.bookings)).where(Room.status == "available")).all()
    required = {e.casefold() for e in query.equipment}
    matches = []
    for room in rooms:
        if query.capacity and room.capacity < query.capacity: continue
        if query.room_type and room.type != query.room_type.value: continue
        if not required.issubset({e.name.casefold() for e in room.equipment}): continue
        if room_is_available(session, room, query)[0]: matches.append(_room_response(room))
    return matches


def book_room(session: Session, room_id: str, payload: BookingCreate, user_id: str, idempotency_key: str) -> BookingResponse:
    operation = f"book_room:{room_id}"
    prior = session.scalar(select(IdempotencyRecord).where(IdempotencyRecord.operation == operation, IdempotencyRecord.key == idempotency_key))
    if prior:
        booking = _get(session, Booking, prior.resource_id)
        return BookingResponse(booking_id=booking.id, booked_by=booking.booked_by, date=booking.date, start_time=_hhmm(booking.start_time), end_time=_hhmm(booking.end_time), purpose=booking.purpose)
    user = _get(session, User, user_id); room = _load_room(session, room_id)
    query = RoomAvailabilityQuery(date=payload.date, start_time=payload.start_time, end_time=payload.end_time)
    available, conflict = room_is_available(session, room, query)
    if room.status != "available" or not available: raise RoomUnavailableError(f"Room {room.room_number} is unavailable", room_id=room_id, conflicting_id=conflict)
    booking = Booking(id=new_id("bk"), room_id=room_id, user_id=user.id, booked_by=user.name, date=payload.date,
                      start_time=_clock(payload.start_time), end_time=_clock(payload.end_time), purpose=payload.purpose)
    session.add(booking); session.add(IdempotencyRecord(operation=operation, key=idempotency_key, resource_id=booking.id)); session.flush()
    return BookingResponse(booking_id=booking.id, booked_by=booking.booked_by, date=booking.date, start_time=payload.start_time, end_time=payload.end_time, purpose=booking.purpose)


def cancel_booking(session: Session, room_id: str, booking_id: str, user_id: str) -> DeleteResponse:
    user = _get(session, User, user_id); booking = _get(session, Booking, booking_id)
    if booking.room_id != room_id: raise NotFoundError("Booking does not belong to this room", id=booking_id)
    if user.role != UserRole.ADMIN.value and booking.user_id != user.id: raise ForbiddenError("Only the booking owner may cancel it", id=booking_id)
    session.delete(booking); session.flush(); return DeleteResponse(id=booking_id)


def register_for_event(session: Session, event_id: str, user_id: str, idempotency_key: str) -> RegistrationResponse:
    operation = f"register_event:{event_id}"
    prior = session.scalar(select(IdempotencyRecord).where(IdempotencyRecord.operation == operation, IdempotencyRecord.key == idempotency_key))
    user = _get(session, User, user_id); event = _load_event(session, event_id)
    if prior:
        registration = session.scalar(select(Registration).where(Registration.event_id == event_id, Registration.student_id == user.student_id))
        if registration: return RegistrationResponse(student_id=registration.student_id, name=registration.name)
    if session.scalar(select(Registration).where(Registration.event_id == event_id, Registration.student_id == user.student_id)):
        raise AlreadyRegisteredError("User is already registered", event_id=event_id)
    if event.status in {EventStatus.CANCELLED.value, EventStatus.COMPLETED.value} or event.registered >= event.capacity:
        raise EventFullError("Event is not accepting registrations", event_id=event_id)
    registration = Registration(event_id=event_id, student_id=user.student_id, name=user.name)
    session.add(registration); event.registered += 1
    session.add(IdempotencyRecord(operation=operation, key=idempotency_key, resource_id=user.student_id)); session.flush()
    return RegistrationResponse(student_id=user.student_id, name=user.name)


def cancel_registration(session: Session, event_id: str, user_id: str, student_id: str) -> DeleteResponse:
    user = _get(session, User, user_id); event = _load_event(session, event_id)
    if user.role != UserRole.ADMIN.value and student_id != user.student_id: raise ForbiddenError("Users may cancel only their own registration", student_id=student_id)
    registration = session.scalar(select(Registration).where(Registration.event_id == event_id, Registration.student_id == student_id))
    if registration is None: raise NotRegisteredError("Registration was not found", event_id=event_id, student_id=student_id)
    session.delete(registration); event.registered -= 1; session.flush(); return DeleteResponse(id=student_id)


def my_schedules(session: Session, user_id: str): return relevant_schedules(get_current_user(session, user_id), list_resources(session, "schedule"))
def my_assignments(session: Session, user_id: str): return relevant_assignments(get_current_user(session, user_id), list_resources(session, "assignment"))
def my_announcements(session: Session, on_date: date): return relevant_announcements(list_resources(session, "announcement"), on_date)
def my_events(session: Session, on_date: date): return relevant_events(list_events(session), on_date)
