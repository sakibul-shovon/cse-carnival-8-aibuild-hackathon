from typing import Annotated

from pydantic import Field, StringConstraints, model_validator

from .common import NonEmptyStr, StrictModel, TimeHHMM, Weekday


ScheduleId = Annotated[str, StringConstraints(pattern=r"^sch-[A-Za-z0-9_-]+$")]


class ScheduleFields(StrictModel):
    course: NonEmptyStr
    title: NonEmptyStr
    day: Weekday
    start_time: TimeHHMM
    end_time: TimeHHMM
    room: NonEmptyStr
    instructor: NonEmptyStr
    section: NonEmptyStr

    @model_validator(mode="after")
    def validate_time_range(self) -> "ScheduleFields":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be later than start_time")
        return self


class ScheduleCreate(ScheduleFields):
    pass


class ScheduleUpdate(StrictModel):
    course: NonEmptyStr | None = None
    title: NonEmptyStr | None = None
    day: Weekday | None = None
    start_time: TimeHHMM | None = None
    end_time: TimeHHMM | None = None
    room: NonEmptyStr | None = None
    instructor: NonEmptyStr | None = None
    section: NonEmptyStr | None = None

    @model_validator(mode="after")
    def reject_empty_patch_and_check_complete_range(self) -> "ScheduleUpdate":
        if not self.model_fields_set:
            raise ValueError("at least one field is required")
        if self.start_time is not None and self.end_time is not None:
            if self.end_time <= self.start_time:
                raise ValueError("end_time must be later than start_time")
        return self


class ScheduleResponse(ScheduleFields):
    id: ScheduleId


class ScheduleListResponse(StrictModel):
    items: list[ScheduleResponse]
    total: Annotated[int, Field(ge=0)]

