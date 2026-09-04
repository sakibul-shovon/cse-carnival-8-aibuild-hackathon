import json
from datetime import date
from pathlib import Path

from app.schemas import (
    AnnouncementResponse,
    AssignmentResponse,
    EventResponse,
    ScheduleResponse,
    UserResponse,
)
from app.services.relevance import (
    relevant_announcements,
    relevant_assignments,
    relevant_events,
    relevant_schedules,
    user_is_registered,
)


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def _load(filename, model):
    raw = json.loads((REPOSITORY_ROOT / "data" / filename).read_text())
    return [model.model_validate(item) for item in raw]


def _demo_user():
    return _load("users.json", UserResponse)[0]


def test_demo_user_enrollments_cover_supplied_schedule():
    schedules = _load("schedules.json", ScheduleResponse)
    assert relevant_schedules(_demo_user(), schedules) == schedules


def test_schedule_relevance_requires_matching_section():
    schedules = _load("schedules.json", ScheduleResponse)
    wrong_section = schedules[0].model_copy(update={"id": "sch-other", "section": "A"})
    assert wrong_section not in relevant_schedules(_demo_user(), schedules + [wrong_section])


def test_assignments_match_enrolled_courses():
    assignments = _load("assignments.json", AssignmentResponse)
    unrelated = assignments[0].model_copy(update={"id": "asgn-other", "course": "MAT 9999"})
    relevant = relevant_assignments(_demo_user(), assignments + [unrelated])
    assert unrelated not in relevant
    assert relevant == assignments


def test_announcements_are_filtered_by_active_date():
    announcements = _load("announcements.json", AnnouncementResponse)
    active = relevant_announcements(announcements, date(2026, 9, 7))
    assert {item.id for item in active} == {
        "ann-001",
        "ann-002",
        "ann-003",
        "ann-005",
        "ann-006",
        "ann-007",
    }


def test_events_are_discoverable_and_registration_is_user_specific():
    events = _load("events.json", EventResponse)
    relevant = relevant_events(events, date(2026, 9, 8))
    assert {item.id for item in relevant} == {"evt-001", "evt-002", "evt-005", "evt-007"}
    assert user_is_registered(_demo_user(), events[1])
    assert not user_is_registered(_demo_user(), events[4])
