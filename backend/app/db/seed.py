import json
from datetime import time
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.schemas.announcement import AnnouncementResponse
from app.schemas.assignment import AssignmentResponse
from app.schemas.event import EventResponse
from app.schemas.room import RoomResponse
from app.schemas.schedule import ScheduleResponse
from app.schemas.user import UserResponse

from .models import (
    Announcement, Assignment, Booking, Enrollment, Event, Registration,
    Room, RoomEquipment, Schedule, User,
)


SEED_ROOT = Path(__file__).resolve().parents[3] / "data"
ROOT_MODELS = (User, Schedule, Room, Event, Announcement, Assignment)


def _time(value: str) -> time:
    return time.fromisoformat(value)


def _load(filename: str) -> list[dict]:
    with (SEED_ROOT / filename).open(encoding="utf-8") as source:
        return json.load(source)


def database_is_empty(session: Session) -> bool:
    return all(session.scalar(select(func.count()).select_from(model)) == 0 for model in ROOT_MODELS)


def import_seed_data(session: Session, seed_root: Path = SEED_ROOT) -> bool:
    """Atomically import validated seed data once; return whether import occurred."""
    if not database_is_empty(session):
        return False

    def load(filename: str) -> list[dict]:
        with (seed_root / filename).open(encoding="utf-8") as source:
            return json.load(source)

    users = [UserResponse.model_validate(item) for item in load("users.json")]
    schedules = [ScheduleResponse.model_validate(item) for item in load("schedules.json")]
    rooms = [RoomResponse.model_validate(item) for item in load("rooms.json")]
    events = [EventResponse.model_validate(item) for item in load("events.json")]
    announcements = [AnnouncementResponse.model_validate(item) for item in load("announcements.json")]
    assignments = [AssignmentResponse.model_validate(item) for item in load("assignments.json")]

    for item in users:
        user = User(id=item.id, student_id=item.student_id, name=item.name, department=item.department, role=item.role.value)
        user.enrollments = [Enrollment(course=e.course, section=e.section) for e in item.enrollments]
        session.add(user)
    for item in schedules:
        data = item.model_dump()
        data["start_time"] = _time(item.start_time)
        data["end_time"] = _time(item.end_time)
        session.add(Schedule(**data))
    for item in rooms:
        room_data = item.model_dump(exclude={"equipment", "bookings"})
        room_data["type"] = item.type.value
        room_data["status"] = item.status.value
        room = Room(**room_data)
        room.equipment = [RoomEquipment(name=name) for name in item.equipment]
        room.bookings = [Booking(
            id=b.booking_id,
            **b.model_dump(exclude={"booking_id", "start_time", "end_time"}),
            start_time=_time(b.start_time),
            end_time=_time(b.end_time),
        ) for b in item.bookings]
        session.add(room)
    for item in events:
        event_data = item.model_dump(exclude={"registrations"})
        event_data["status"] = item.status.value
        event_data["start_time"] = _time(item.start_time)
        event_data["end_time"] = _time(item.end_time)
        event = Event(**event_data)
        event.registrations = [Registration(**r.model_dump()) for r in item.registrations]
        session.add(event)
    for item in announcements:
        data = item.model_dump()
        data["priority"] = item.priority.value
        session.add(Announcement(**data))
    for item in assignments:
        data = item.model_dump()
        data["status"] = item.status.value
        session.add(Assignment(**data))

    session.flush()
    return True
