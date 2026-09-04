from datetime import date as Date
from enum import StrEnum
from typing import Annotated

from pydantic import Field, StringConstraints, model_validator

from .common import NonEmptyStr, StrictModel


AnnouncementId = Annotated[str, StringConstraints(pattern=r"^ann-[A-Za-z0-9_-]+$")]


class AnnouncementPriority(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AnnouncementFields(StrictModel):
    title: NonEmptyStr
    body: NonEmptyStr
    date: Date
    priority: AnnouncementPriority
    posted_by: NonEmptyStr
    expires: Date

    @model_validator(mode="after")
    def validate_expiry(self) -> "AnnouncementFields":
        if self.expires < self.date:
            raise ValueError("expires cannot be earlier than date")
        return self


class AnnouncementCreate(AnnouncementFields):
    pass


class AnnouncementUpdate(StrictModel):
    title: NonEmptyStr | None = None
    body: NonEmptyStr | None = None
    date: Date | None = None
    priority: AnnouncementPriority | None = None
    posted_by: NonEmptyStr | None = None
    expires: Date | None = None

    @model_validator(mode="after")
    def reject_empty_patch(self) -> "AnnouncementUpdate":
        if not self.model_fields_set:
            raise ValueError("at least one field is required")
        return self


class AnnouncementResponse(AnnouncementFields):
    id: AnnouncementId


class AnnouncementListResponse(StrictModel):
    items: list[AnnouncementResponse]
    total: Annotated[int, Field(ge=0)]
