from typing import Annotated

from pydantic import StringConstraints, model_validator

from .common import NonEmptyStr, StrictModel, UserRole


UserId = Annotated[str, StringConstraints(pattern=r"^usr-[A-Za-z0-9_-]+$")]


class Enrollment(StrictModel):
    """A user's membership in one course section for the current MVP term."""

    course: NonEmptyStr
    section: NonEmptyStr


class UserResponse(StrictModel):
    id: UserId
    student_id: NonEmptyStr
    name: NonEmptyStr
    department: NonEmptyStr
    role: UserRole
    enrollments: list[Enrollment]

    @model_validator(mode="after")
    def reject_duplicate_enrollments(self) -> "UserResponse":
        normalized = {
            (" ".join(item.course.upper().split()), item.section.casefold())
            for item in self.enrollments
        }
        if len(normalized) != len(self.enrollments):
            raise ValueError("enrollments must not contain duplicates")
        return self
