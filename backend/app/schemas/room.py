from datetime import date as Date
from enum import StrEnum
from typing import Annotated

from pydantic import Field, StringConstraints, model_validator

from .common import NonEmptyStr, StrictModel, TimeHHMM


RoomId = Annotated[str, StringConstraints(pattern=r"^room-[A-Za-z0-9_-]+$")]
BookingId = Annotated[str, StringConstraints(pattern=r"^bk-[A-Za-z0-9_-]+$")]


class RoomType(StrEnum):
    CLASSROOM = "classroom"
    LAB = "lab"
    SEMINAR = "seminar"


class RoomStatus(StrEnum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"


class BookingFields(StrictModel):
    booked_by: NonEmptyStr
    date: Date
    start_time: TimeHHMM
    end_time: TimeHHMM
    purpose: NonEmptyStr

    @model_validator(mode="after")
    def validate_time_range(self) -> "BookingFields":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be later than start_time")
        return self


class BookingCreate(BookingFields):
    pass


class BookingResponse(BookingFields):
    booking_id: BookingId


class RoomFields(StrictModel):
    room_number: NonEmptyStr
    type: RoomType
    capacity: Annotated[int, Field(gt=0, le=1000)]
    equipment: list[NonEmptyStr]
    floor: Annotated[int, Field(ge=0, le=200)]
    status: RoomStatus


class RoomCreate(RoomFields):
    pass


class RoomUpdate(StrictModel):
    room_number: NonEmptyStr | None = None
    type: RoomType | None = None
    capacity: Annotated[int, Field(gt=0, le=1000)] | None = None
    equipment: list[NonEmptyStr] | None = None
    floor: Annotated[int, Field(ge=0, le=200)] | None = None
    status: RoomStatus | None = None

    @model_validator(mode="after")
    def reject_empty_patch(self) -> "RoomUpdate":
        if not self.model_fields_set:
            raise ValueError("at least one field is required")
        return self


class RoomResponse(RoomFields):
    id: RoomId
    bookings: list[BookingResponse] = Field(default_factory=list)


class RoomListResponse(StrictModel):
    items: list[RoomResponse]
    total: Annotated[int, Field(ge=0)]


class RoomAvailabilityQuery(StrictModel):
    date: Date
    start_time: TimeHHMM
    end_time: TimeHHMM
    capacity: Annotated[int, Field(gt=0)] | None = None
    equipment: list[NonEmptyStr] = Field(default_factory=list)
    room_type: RoomType | None = None

    @model_validator(mode="after")
    def validate_time_range(self) -> "RoomAvailabilityQuery":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be later than start_time")
        return self


class RoomAvailabilityResponse(StrictModel):
    items: list[RoomResponse]
    total: Annotated[int, Field(ge=0)]
