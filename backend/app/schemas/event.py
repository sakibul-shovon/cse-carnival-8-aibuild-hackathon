from datetime import date as Date
from enum import StrEnum
from typing import Annotated

from pydantic import Field, StringConstraints, model_validator

from .common import NonEmptyStr, StrictModel, TimeHHMM


EventId = Annotated[str, StringConstraints(pattern=r"^evt-[A-Za-z0-9_-]+$")]
StudentId = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9-]+$")]


class EventStatus(StrEnum):
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FULL = "full"


class RegistrationCreate(StrictModel):
    student_id: StudentId
    name: NonEmptyStr


class RegistrationResponse(RegistrationCreate):
    pass


class EventFields(StrictModel):
    name: NonEmptyStr
    description: NonEmptyStr
    date: Date
    start_time: TimeHHMM
    end_time: TimeHHMM
    end_date: Date
    venue: NonEmptyStr
    organizer: NonEmptyStr
    capacity: Annotated[int, Field(gt=0, le=100000)]
    status: EventStatus = EventStatus.UPCOMING

    @model_validator(mode="after")
    def validate_date_and_time_range(self) -> "EventFields":
        if self.end_date < self.date:
            raise ValueError("end_date cannot be earlier than date")
        if self.end_date == self.date and self.end_time <= self.start_time:
            raise ValueError("end_time must be later than start_time for a single-day event")
        return self


class EventCreate(EventFields):
    pass


class EventUpdate(StrictModel):
    name: NonEmptyStr | None = None
    description: NonEmptyStr | None = None
    date: Date | None = None
    start_time: TimeHHMM | None = None
    end_time: TimeHHMM | None = None
    end_date: Date | None = None
    venue: NonEmptyStr | None = None
    organizer: NonEmptyStr | None = None
    capacity: Annotated[int, Field(gt=0, le=100000)] | None = None
    status: EventStatus | None = None

    @model_validator(mode="after")
    def reject_empty_patch(self) -> "EventUpdate":
        if not self.model_fields_set:
            raise ValueError("at least one field is required")
        return self


class EventResponse(EventFields):
    id: EventId
    registered: Annotated[int, Field(ge=0)]
    registrations: list[RegistrationResponse] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_registration_count(self) -> "EventResponse":
        if self.registered > self.capacity:
            raise ValueError("registered cannot exceed capacity")
        return self


class EventListResponse(StrictModel):
    items: list[EventResponse]
    total: Annotated[int, Field(ge=0)]
