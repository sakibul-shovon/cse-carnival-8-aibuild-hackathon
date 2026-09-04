"""Deterministic user-relevance rules for the single-user hackathon MVP.

The LLM must consume these filtered results rather than infer enrollment from
free text. These functions accept already-validated models and do no I/O, which
makes them reusable by API routes, database services, and agent tools.
"""

from datetime import date as Date

from app.schemas import (
    AnnouncementResponse,
    AssignmentResponse,
    EventResponse,
    ScheduleResponse,
    UserResponse,
)
from app.schemas.event import EventStatus


def _normalize_course(value: str) -> str:
    return " ".join(value.upper().split())


def _normalize_section(value: str) -> str:
    return value.strip().casefold()


def _enrollment_keys(user: UserResponse) -> set[tuple[str, str]]:
    return {
        (_normalize_course(item.course), _normalize_section(item.section))
        for item in user.enrollments
    }


def _enrolled_courses(user: UserResponse) -> set[str]:
    return {_normalize_course(item.course) for item in user.enrollments}


def relevant_schedules(
    user: UserResponse, schedules: list[ScheduleResponse]
) -> list[ScheduleResponse]:
    """Return classes matching both the enrolled course and section."""

    memberships = _enrollment_keys(user)
    return [
        item
        for item in schedules
        if (_normalize_course(item.course), _normalize_section(item.section))
        in memberships
    ]


def relevant_assignments(
    user: UserResponse, assignments: list[AssignmentResponse]
) -> list[AssignmentResponse]:
    """Return assignments for enrolled courses.

    The supplied assignment schema has no section. Course-level matching is the
    narrowest deterministic rule available for this MVP.
    """

    courses = _enrolled_courses(user)
    return [item for item in assignments if _normalize_course(item.course) in courses]


def relevant_announcements(
    announcements: list[AnnouncementResponse], on_date: Date
) -> list[AnnouncementResponse]:
    """Return active announcements.

    The seed schema has no structured audience, so every active announcement is
    campus-wide. Parsing audience from prose would be nondeterministic.
    """

    return [item for item in announcements if item.date <= on_date <= item.expires]


def relevant_events(
    events: list[EventResponse], on_date: Date
) -> list[EventResponse]:
    """Return current or future discoverable events, including full events."""

    discoverable = {
        EventStatus.UPCOMING,
        EventStatus.ONGOING,
        EventStatus.FULL,
    }
    return [
        item
        for item in events
        if item.end_date >= on_date and item.status in discoverable
    ]


def user_is_registered(user: UserResponse, event: EventResponse) -> bool:
    return any(item.student_id == user.student_id for item in event.registrations)
