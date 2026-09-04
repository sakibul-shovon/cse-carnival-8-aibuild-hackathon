from datetime import date as Date
from enum import StrEnum
from typing import Annotated

from pydantic import Field, StringConstraints, model_validator

from .common import NonEmptyStr, StrictModel


AssignmentId = Annotated[str, StringConstraints(pattern=r"^asgn-[A-Za-z0-9_-]+$")]


class AssignmentStatus(StrEnum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    GRADED = "graded"
    LATE = "late"


class AssignmentFields(StrictModel):
    course: NonEmptyStr
    course_title: NonEmptyStr
    title: NonEmptyStr
    description: NonEmptyStr
    assigned_date: Date
    deadline: Date
    submission_platform: NonEmptyStr
    status: AssignmentStatus
    marks: Annotated[float, Field(ge=0, le=10000)]

    @model_validator(mode="after")
    def validate_deadline(self) -> "AssignmentFields":
        if self.deadline < self.assigned_date:
            raise ValueError("deadline cannot be earlier than assigned_date")
        return self


class AssignmentCreate(AssignmentFields):
    pass


class AssignmentUpdate(StrictModel):
    course: NonEmptyStr | None = None
    course_title: NonEmptyStr | None = None
    title: NonEmptyStr | None = None
    description: NonEmptyStr | None = None
    assigned_date: Date | None = None
    deadline: Date | None = None
    submission_platform: NonEmptyStr | None = None
    status: AssignmentStatus | None = None
    marks: Annotated[float, Field(ge=0, le=10000)] | None = None

    @model_validator(mode="after")
    def reject_empty_patch(self) -> "AssignmentUpdate":
        if not self.model_fields_set:
            raise ValueError("at least one field is required")
        return self


class AssignmentResponse(AssignmentFields):
    id: AssignmentId


class AssignmentListResponse(StrictModel):
    items: list[AssignmentResponse]
    total: Annotated[int, Field(ge=0)]
