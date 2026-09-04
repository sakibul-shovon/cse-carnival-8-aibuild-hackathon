from datetime import date, time
from typing import Optional

from sqlalchemy import CheckConstraint, Date, Float, ForeignKey, Index, Integer, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    department: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(32), index=True)
    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="user")


class Enrollment(Base):
    __tablename__ = "enrollments"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course: Mapped[str] = mapped_column(String(64), index=True)
    section: Mapped[str] = mapped_column(String(64))
    user: Mapped[User] = relationship(back_populates="enrollments")
    __table_args__ = (UniqueConstraint("user_id", "course", "section", name="uq_enrollment_user_course_section"),)


class Schedule(Base):
    __tablename__ = "schedules"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    course: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(300))
    day: Mapped[str] = mapped_column(String(16), index=True)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    room: Mapped[str] = mapped_column(String(64), index=True)
    instructor: Mapped[str] = mapped_column(String(200))
    section: Mapped[str] = mapped_column(String(64), index=True)
    __table_args__ = (CheckConstraint("end_time > start_time", name="valid_time_range"),)


class Room(Base):
    __tablename__ = "rooms"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    room_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    type: Mapped[str] = mapped_column(String(32), index=True)
    capacity: Mapped[int] = mapped_column(Integer)
    floor: Mapped[int] = mapped_column(Integer, index=True)
    status: Mapped[str] = mapped_column(String(32), index=True)
    equipment: Mapped[list["RoomEquipment"]] = relationship(back_populates="room", cascade="all, delete-orphan")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="room", cascade="all, delete-orphan")
    __table_args__ = (CheckConstraint("capacity > 0", name="positive_capacity"), CheckConstraint("floor >= 0", name="nonnegative_floor"))


class RoomEquipment(Base):
    __tablename__ = "room_equipment"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    room: Mapped[Room] = relationship(back_populates="equipment")
    __table_args__ = (UniqueConstraint("room_id", "name", name="uq_room_equipment_room_name"),)


class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    booked_by: Mapped[str] = mapped_column(String(200))
    date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    purpose: Mapped[str] = mapped_column(String(500))
    room: Mapped[Room] = relationship(back_populates="bookings")
    user: Mapped[Optional[User]] = relationship(back_populates="bookings")
    __table_args__ = (
        CheckConstraint("end_time > start_time", name="valid_time_range"),
        Index("ix_bookings_room_date_interval", "room_id", "date", "start_time", "end_time"),
    )


class Event(Base):
    __tablename__ = "events"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(String(2000))
    date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    end_date: Mapped[date] = mapped_column(Date, index=True)
    venue: Mapped[str] = mapped_column(String(200), index=True)
    organizer: Mapped[str] = mapped_column(String(200))
    capacity: Mapped[int] = mapped_column(Integer)
    registered: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), index=True)
    registrations: Mapped[list["Registration"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    __table_args__ = (
        CheckConstraint("capacity > 0", name="positive_capacity"),
        CheckConstraint("registered >= 0 AND registered <= capacity", name="valid_registered_count"),
        CheckConstraint("end_date >= date", name="valid_date_range"),
    )


class Registration(Base):
    __tablename__ = "registrations"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(200))
    event: Mapped[Event] = relationship(back_populates="registrations")
    __table_args__ = (UniqueConstraint("event_id", "student_id", name="uq_registration_event_student"),)


class Announcement(Base):
    __tablename__ = "announcements"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(String(4000))
    date: Mapped[date] = mapped_column(Date, index=True)
    priority: Mapped[str] = mapped_column(String(16), index=True)
    posted_by: Mapped[str] = mapped_column(String(200))
    expires: Mapped[date] = mapped_column(Date, index=True)
    __table_args__ = (CheckConstraint("expires >= date", name="valid_expiry"),)


class Assignment(Base):
    __tablename__ = "assignments"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    course: Mapped[str] = mapped_column(String(64), index=True)
    course_title: Mapped[str] = mapped_column(String(300))
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(String(3000))
    assigned_date: Mapped[date] = mapped_column(Date, index=True)
    deadline: Mapped[date] = mapped_column(Date, index=True)
    submission_platform: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(32), index=True)
    marks: Mapped[float] = mapped_column(Float)
    __table_args__ = (
        CheckConstraint("deadline >= assigned_date", name="valid_deadline"),
        CheckConstraint("marks >= 0", name="nonnegative_marks"),
    )


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    operation: Mapped[str] = mapped_column(String(100))
    key: Mapped[str] = mapped_column(String(200))
    resource_id: Mapped[str] = mapped_column(String(64))
    __table_args__ = (UniqueConstraint("operation", "key", name="uq_idempotency_operation_key"),)
