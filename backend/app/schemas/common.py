"""Shared API contract types.

These models intentionally reject unknown fields. A misspelled field should fail
at the boundary instead of being silently ignored and appearing to succeed.
"""

from enum import StrEnum
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
TimeHHMM = Annotated[
    str,
    StringConstraints(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$"),
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Weekday(StrEnum):
    SUNDAY = "Sunday"
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"


class UserRole(StrEnum):
    STUDENT = "student"
    ADMIN = "admin"


class ErrorCode(StrEnum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    FORBIDDEN = "FORBIDDEN"
    ROOM_UNAVAILABLE = "ROOM_UNAVAILABLE"
    EVENT_FULL = "EVENT_FULL"
    ALREADY_REGISTERED = "ALREADY_REGISTERED"
    NOT_REGISTERED = "NOT_REGISTERED"
    AGENT_UNAVAILABLE = "AGENT_UNAVAILABLE"


class ErrorDetail(StrictModel):
    code: ErrorCode
    message: NonEmptyStr
    details: dict[str, Any] | None = None


class ErrorResponse(StrictModel):
    error: ErrorDetail


class DeleteResponse(StrictModel):
    id: NonEmptyStr
    deleted: bool = True


class PaginationMeta(StrictModel):
    total: Annotated[int, Field(ge=0)]
    limit: Annotated[int, Field(ge=1, le=100)]
    offset: Annotated[int, Field(ge=0)]

