import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.schemas import (
    AnnouncementResponse,
    AssignmentResponse,
    EventResponse,
    RoomResponse,
    ScheduleResponse,
    ScheduleUpdate,
    UserResponse,
)
from app.schemas.room import BookingCreate, RoomAvailabilityQuery


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize(
    ("filename", "model"),
    [
        ("schedules.json", ScheduleResponse),
        ("rooms.json", RoomResponse),
        ("events.json", EventResponse),
        ("announcements.json", AnnouncementResponse),
        ("assignments.json", AssignmentResponse),
        ("users.json", UserResponse),
    ],
)
def test_seed_records_match_contract(filename, model):
    records = json.loads((REPOSITORY_ROOT / "data" / filename).read_text())
    assert records
    for record in records:
        model.model_validate(record)


def test_empty_patch_is_rejected():
    with pytest.raises(ValidationError):
        ScheduleUpdate.model_validate({})


def test_booking_requires_forward_time_range():
    with pytest.raises(ValidationError):
        BookingCreate.model_validate(
            {
                "booked_by": "Student",
                "date": "2026-09-05",
                "start_time": "17:00",
                "end_time": "15:00",
                "purpose": "Study",
            }
        )


def test_availability_query_uses_strict_hhmm():
    with pytest.raises(ValidationError):
        RoomAvailabilityQuery.model_validate(
            {
                "date": "2026-09-05",
                "start_time": "2 PM",
                "end_time": "16:00",
            }
        )
