import json
from datetime import date
from typing import Any, Callable

from app.schemas.announcement import AnnouncementPriority
from app.schemas.common import Weekday
from app.schemas.room import RoomAvailabilityQuery, RoomType

from .gateway import (
    BookRoomCommand,
    CampusDataGateway,
    CancelBookingCommand,
    CancelEventRegistrationCommand,
    RegisterForEventCommand,
)


def _json(value: Any) -> str:
    if hasattr(value, "model_dump"):
        value = value.model_dump(mode="json")
    elif isinstance(value, list):
        value = [item.model_dump(mode="json") if hasattr(item, "model_dump") else item for item in value]
    return json.dumps(value, ensure_ascii=False)


def tool_definitions() -> list[dict]:
    def tool(name, description, properties, required=()):
        return {"type":"function", "name":name, "description":description, "strict":True,
                "parameters":{"type":"object", "properties":properties, "required":list(required), "additionalProperties":False}}
    string = {"type":"string"}; day = {"type":["string","null"]}
    return [
        tool("get_my_schedules", "Read the current user's live class schedule; optionally filter by weekday.", {"day":day}, ["day"]),
        tool("get_my_assignments", "Read the current user's live assignments, optionally within inclusive deadline bounds.",
             {"due_from":{"type":["string","null"],"format":"date"}, "due_to":{"type":["string","null"],"format":"date"}}, ["due_from","due_to"]),
        tool("get_announcements", "Read live active announcements on an ISO date; optionally filter priority.",
             {"on_date":{"type":"string","format":"date"}, "priority":{"type":["string","null"]}}, ["on_date","priority"]),
        tool("get_events", "Read live discoverable events on or after an ISO date.", {"on_date":{"type":"string","format":"date"}}, ["on_date"]),
        tool("list_rooms", "Read live operational room inventory filtered by type, capacity, or equipment. Use when no date/time was specified.",
             {"room_type":{"type":["string","null"]}, "min_capacity":{"type":["integer","null"]}, "equipment":{"type":"array","items":string}}, ["room_type","min_capacity","equipment"]),
        tool("find_available_rooms", "Find live room availability for an exact date and half-open time interval.",
             {"date":{"type":"string","format":"date"}, "start_time":string, "end_time":string,
              "capacity":{"type":["integer","null"]}, "equipment":{"type":"array","items":string}, "room_type":{"type":["string","null"]}},
             ["date","start_time","end_time","capacity","equipment","room_type"]),
        tool("book_room", "Book a specific room. Call only after the user supplied room, date, start/end time, and purpose.",
             {"room_id":string,"date":{"type":"string","format":"date"},"start_time":string,"end_time":string,"purpose":string},
             ["room_id","date","start_time","end_time","purpose"]),
        tool("cancel_room_booking", "Cancel a booking owned by the current user.", {"room_id":string,"booking_id":string}, ["room_id","booking_id"]),
        tool("register_event", "Register the current user for a specific event.", {"event_id":string}, ["event_id"]),
        tool("cancel_event_registration", "Cancel the current user's event registration.", {"event_id":string}, ["event_id"]),
    ]


class CampusTools:
    def __init__(self, gateway: CampusDataGateway) -> None:
        self.gateway = gateway

    def execute(self, name: str, args: dict, call_id: str) -> tuple[str, str]:
        handlers: dict[str, Callable[[], Any]] = {
            "get_my_schedules": lambda: self._schedules(args),
            "get_my_assignments": lambda: self._assignments(args),
            "get_announcements": lambda: self._announcements(args),
            "get_events": lambda: self.gateway.get_relevant_events(
                date.fromisoformat(args["on_date"])
            ),
            "list_rooms": lambda: self.gateway.list_rooms(
                RoomType(args["room_type"]) if args.get("room_type") else None,
                args.get("min_capacity"),
                tuple(args.get("equipment") or ()),
            ),
            "find_available_rooms": lambda: self.gateway.find_available_rooms(
                RoomAvailabilityQuery(**args)
            ),
            "book_room": lambda: self.gateway.book_room(
                BookRoomCommand(
                    room_id=args["room_id"],
                    date=args["date"],
                    start_time=args["start_time"],
                    end_time=args["end_time"],
                    purpose=args["purpose"],
                    idempotency_key=f"agent:{call_id}",
                )
            ),
            "cancel_room_booking": lambda: self.gateway.cancel_my_booking(
                CancelBookingCommand(
                    room_id=args["room_id"], booking_id=args["booking_id"]
                )
            ),
            "register_event": lambda: self.gateway.register_for_event(
                RegisterForEventCommand(
                    event_id=args["event_id"],
                    idempotency_key=f"agent:{call_id}",
                )
            ),
            "cancel_event_registration": lambda: (
                self.gateway.cancel_my_event_registration(
                    CancelEventRegistrationCommand(event_id=args["event_id"])
                )
            ),
        }
        if name not in handlers: raise ValueError(f"Unknown tool: {name}")
        result = handlers[name]()
        summary = self._summary(name, result)
        return _json(result), summary

    def _schedules(self, args):
        day = Weekday(args["day"]) if args.get("day") else None
        return self.gateway.get_my_schedules(day)

    def _assignments(self, args):
        due_from = date.fromisoformat(args["due_from"]) if args.get("due_from") else None
        due_to = date.fromisoformat(args["due_to"]) if args.get("due_to") else None
        return self.gateway.get_my_assignments(due_from, due_to)

    def _announcements(self, args):
        priority = (
            AnnouncementPriority(args["priority"]) if args.get("priority") else None
        )
        return self.gateway.get_active_announcements(
            date.fromisoformat(args["on_date"]), priority
        )

    @staticmethod
    def _summary(name: str, result: Any) -> str:
        if isinstance(result, list): return f"Returned {len(result)} result(s)"
        identifier = getattr(result, "booking_id", None) or getattr(result, "id", None) or getattr(result, "student_id", None)
        return f"{name} succeeded" + (f" ({identifier})" if identifier else "")
