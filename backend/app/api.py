from datetime import date, datetime
from zoneinfo import ZoneInfo
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, Request, status
from sqlalchemy.orm import Session

from app.schemas import *
from app.schemas.agent import AgentStatus
from app.schemas.common import DeleteResponse
from app.agent import ServiceCampusDataGateway
from app.services import domain


router = APIRouter(prefix="/api/v1")
router.demo_user_id = "usr-001"
router.app_timezone = "Asia/Dhaka"


def db_session() -> Session:
    raise RuntimeError("Database dependency was not configured")


Db = Annotated[Session, Depends(db_session)]
IdempotencyKey = Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=200)]


def _list(items, response_type):
    return response_type(items=items, total=len(items))


@router.get("/users/me", response_model=UserResponse)
def current_user(db: Db): return domain.get_current_user(db, router.demo_user_id)


@router.get("/users/me/schedules", response_model=ScheduleListResponse)
def user_schedules(db: Db):
    items = domain.my_schedules(db, router.demo_user_id); return _list(items, ScheduleListResponse)


@router.get("/users/me/assignments", response_model=AssignmentListResponse)
def user_assignments(db: Db):
    items = domain.my_assignments(db, router.demo_user_id); return _list(items, AssignmentListResponse)


@router.get("/users/me/announcements", response_model=AnnouncementListResponse)
def user_announcements(db: Db, on_date: date | None = None):
    current = datetime.now(ZoneInfo(router.app_timezone)).date()
    items = domain.my_announcements(db, on_date or current); return _list(items, AnnouncementListResponse)


@router.get("/users/me/events", response_model=EventListResponse)
def user_events(db: Db, on_date: date | None = None):
    current = datetime.now(ZoneInfo(router.app_timezone)).date()
    items = domain.my_events(db, on_date or current); return _list(items, EventListResponse)


@router.post("/agent/messages", responses={503: {"model": ErrorResponse}})
def agent_messages(request: Request, db: Db, payload: AgentMessageRequest) -> AgentMessageResponse:
    from app.services.errors import AgentUnavailableError
    orchestrator = request.app.state.agent
    if orchestrator is None:
        raise AgentUnavailableError("The agent provider is not configured. Set GEMINI_API_KEY.")
    gateway = ServiceCampusDataGateway(db, router.demo_user_id)
    response = orchestrator.run(gateway, payload.message, payload.conversation_id)
    if response.status in {AgentStatus.FAILED, AgentStatus.REFUSED}:
        db.rollback()
    return response


@router.get("/schedules", response_model=ScheduleListResponse)
def schedules(db: Db, day: str | None = None, course: str | None = None, room: str | None = None):
    items = domain.list_resources(db, "schedule", day=day, course=course, room=room); return _list(items, ScheduleListResponse)
@router.get("/schedules/{item_id}", response_model=ScheduleResponse)
def schedule(db: Db, item_id: str): return domain.get_resource(db, "schedule", item_id)
@router.post("/schedules", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def add_schedule(db: Db, payload: ScheduleCreate): return domain.create_resource(db, "schedule", payload)
@router.patch("/schedules/{item_id}", response_model=ScheduleResponse)
def edit_schedule(db: Db, item_id: str, payload: ScheduleUpdate): return domain.update_resource(db, "schedule", item_id, payload)
@router.delete("/schedules/{item_id}", response_model=DeleteResponse)
def remove_schedule(db: Db, item_id: str): return domain.delete_resource(db, "schedule", item_id)


@router.get("/rooms/availability", response_model=RoomAvailabilityResponse)
def room_availability(db: Db, date_: date = Query(alias="date"), start_time: str = Query(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$"),
                      end_time: str = Query(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$"), capacity: int | None = Query(default=None, gt=0),
                      equipment: list[str] = Query(default=[]), room_type: str | None = None):
    query = RoomAvailabilityQuery(date=date_, start_time=start_time, end_time=end_time, capacity=capacity, equipment=equipment, room_type=room_type)
    items = domain.available_rooms(db, query); return _list(items, RoomAvailabilityResponse)


@router.get("/rooms", response_model=RoomListResponse)
def rooms(db: Db, type: str | None = None, status_: str | None = Query(default=None, alias="status"), min_capacity: int | None = Query(default=None, gt=0), equipment: list[str] = Query(default=[])):
    items = domain.list_rooms(db, type, status_, min_capacity, equipment); return _list(items, RoomListResponse)
@router.get("/rooms/{item_id}", response_model=RoomResponse)
def room(db: Db, item_id: str): return domain.get_room(db, item_id)
@router.post("/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def add_room(db: Db, payload: RoomCreate): return domain.create_room(db, payload)
@router.patch("/rooms/{item_id}", response_model=RoomResponse)
def edit_room(db: Db, item_id: str, payload: RoomUpdate): return domain.update_room(db, item_id, payload)
@router.delete("/rooms/{item_id}", response_model=DeleteResponse)
def remove_room(db: Db, item_id: str): return domain.delete_room(db, item_id)
@router.post("/rooms/{item_id}/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def add_booking(db: Db, item_id: str, payload: BookingCreate, idempotency_key: IdempotencyKey):
    return domain.book_room(db, item_id, payload, router.demo_user_id, idempotency_key)
@router.delete("/rooms/{item_id}/bookings/{booking_id}", response_model=DeleteResponse)
def remove_booking(db: Db, item_id: str, booking_id: str): return domain.cancel_booking(db, item_id, booking_id, router.demo_user_id)


@router.get("/events", response_model=EventListResponse)
def events(db: Db, date_from: date | None = None, date_to: date | None = None, status_: str | None = Query(default=None, alias="status"), venue: str | None = None):
    items = domain.list_events(db, date_from, date_to, status_, venue); return _list(items, EventListResponse)
@router.get("/events/{item_id}", response_model=EventResponse)
def event(db: Db, item_id: str): return domain.get_event(db, item_id)
@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def add_event(db: Db, payload: EventCreate): return domain.create_event(db, payload)
@router.patch("/events/{item_id}", response_model=EventResponse)
def edit_event(db: Db, item_id: str, payload: EventUpdate): return domain.update_event(db, item_id, payload)
@router.delete("/events/{item_id}", response_model=DeleteResponse)
def remove_event(db: Db, item_id: str): return domain.delete_event(db, item_id)
@router.post("/events/{item_id}/registrations", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
def add_registration(db: Db, item_id: str, payload: RegistrationCreate, idempotency_key: IdempotencyKey):
    # Identity fields are contract-compatible but cannot override server identity.
    return domain.register_for_event(db, item_id, router.demo_user_id, idempotency_key)
@router.delete("/events/{item_id}/registrations/{student_id}", response_model=DeleteResponse)
def remove_registration(db: Db, item_id: str, student_id: str): return domain.cancel_registration(db, item_id, router.demo_user_id, student_id)


@router.get("/announcements", response_model=AnnouncementListResponse)
def announcements(db: Db, priority: str | None = None, active_on: date | None = None, posted_by: str | None = None):
    items = domain.list_announcements(db, priority, active_on, posted_by)
    return _list(items, AnnouncementListResponse)
@router.get("/announcements/{item_id}", response_model=AnnouncementResponse)
def announcement(db: Db, item_id: str): return domain.get_resource(db, "announcement", item_id)
@router.post("/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def add_announcement(db: Db, payload: AnnouncementCreate): return domain.create_resource(db, "announcement", payload)
@router.patch("/announcements/{item_id}", response_model=AnnouncementResponse)
def edit_announcement(db: Db, item_id: str, payload: AnnouncementUpdate): return domain.update_resource(db, "announcement", item_id, payload)
@router.delete("/announcements/{item_id}", response_model=DeleteResponse)
def remove_announcement(db: Db, item_id: str): return domain.delete_resource(db, "announcement", item_id)


@router.get("/assignments", response_model=AssignmentListResponse)
def assignments(db: Db, course: str | None = None, status_: str | None = Query(default=None, alias="status"), due_from: date | None = None, due_to: date | None = None):
    items = domain.list_assignments(db, course, status_, due_from, due_to)
    return _list(items, AssignmentListResponse)
@router.get("/assignments/{item_id}", response_model=AssignmentResponse)
def assignment(db: Db, item_id: str): return domain.get_resource(db, "assignment", item_id)
@router.post("/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
def add_assignment(db: Db, payload: AssignmentCreate): return domain.create_resource(db, "assignment", payload)
@router.patch("/assignments/{item_id}", response_model=AssignmentResponse)
def edit_assignment(db: Db, item_id: str, payload: AssignmentUpdate): return domain.update_resource(db, "assignment", item_id, payload)
@router.delete("/assignments/{item_id}", response_model=DeleteResponse)
def remove_assignment(db: Db, item_id: str): return domain.delete_resource(db, "assignment", item_id)
