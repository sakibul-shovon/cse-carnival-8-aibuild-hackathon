"""Public Pydantic contract surface for CampusOS API v1."""

from .agent import AgentMessageRequest, AgentMessageResponse
from .announcement import (
    AnnouncementCreate,
    AnnouncementListResponse,
    AnnouncementResponse,
    AnnouncementUpdate,
)
from .assignment import (
    AssignmentCreate,
    AssignmentListResponse,
    AssignmentResponse,
    AssignmentUpdate,
)
from .common import DeleteResponse, ErrorResponse
from .event import (
    EventCreate,
    EventListResponse,
    EventResponse,
    EventUpdate,
    RegistrationCreate,
    RegistrationResponse,
)
from .room import (
    BookingCreate,
    BookingResponse,
    RoomAvailabilityQuery,
    RoomAvailabilityResponse,
    RoomCreate,
    RoomListResponse,
    RoomResponse,
    RoomUpdate,
)
from .schedule import (
    ScheduleCreate,
    ScheduleListResponse,
    ScheduleResponse,
    ScheduleUpdate,
)
from .user import Enrollment, UserResponse

__all__ = [name for name in globals() if not name.startswith("_")]
