import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.agent.provider import GeminiProvider, ProviderTurn, ToolRequest
from app.db.models import Booking
from app.main import create_app
from app.settings import Settings


class CampusFakeProvider:
    def __init__(self):
        self.pending: dict[str, str] = {}
        self.seen_instructions: list[str] = []

    def respond(self, *, instructions, input_items, tools, previous_response_id=None):
        self.seen_instructions.append(instructions)
        response_id = f"resp-{len(self.seen_instructions)}"
        if isinstance(input_items, str):
            text = input_items.casefold()
            calls = []
            if "next class" in text:
                calls = [ToolRequest("c1", "get_my_schedules", {"day":None}), ToolRequest("c2", "get_announcements", {"on_date":"2026-09-04","priority":None})]
            elif "wednesday" in text:
                calls = [ToolRequest("c3", "get_my_schedules", {"day":"Wednesday"})]
            elif "due this week" in text:
                calls = [ToolRequest("c4", "get_my_assignments", {"due_from":"2026-08-31","due_to":"2026-09-06"})]
            elif "high priority" in text:
                calls = [ToolRequest("c5", "get_announcements", {"on_date":"2026-09-04","priority":"high"})]
            elif "free until" in text:
                calls = [ToolRequest("c6", "get_my_schedules", {"day":None}), ToolRequest("c7", "get_events", {"on_date":"2026-09-04"})]
            elif "which labs" in text:
                calls = [ToolRequest("c8", "list_rooms", {"room_type":"lab","min_capacity":30,"equipment":["projector"]})]
            elif "need a room" in text:
                calls = [ToolRequest("c9", "find_available_rooms", {"date":"2026-09-05","start_time":"14:00","end_time":"16:00","capacity":5,"equipment":["projector"],"room_type":None})]
            elif "register me" in text:
                calls = [ToolRequest("c10", "get_events", {"on_date":"2026-09-04"})]
                self.pending[response_id] = "register"
            elif "book room" in text:
                calls = [ToolRequest("c11", "book_room", {"room_id":"room-002","date":"2026-09-05","start_time":"15:00","end_time":"17:00","purpose":"group study"})]
            elif "edited event" in text:
                calls = [ToolRequest("c12", "get_events", {"on_date":"2026-09-04"})]
                self.pending[response_id] = "echo"
            return ProviderTurn(response_id, tool_calls=calls)
        if self.pending.pop(previous_response_id, None) == "register":
            return ProviderTurn(response_id, tool_calls=[ToolRequest("c13", "register_event", {"event_id":"evt-002"})])
        if previous_response_id and previous_response_id.startswith("resp") and input_items:
            payload = " ".join(item["output"] for item in input_items)
            if "Renamed Live Event" in payload:
                return ProviderTurn(response_id, text="The live event is Renamed Live Event.")
        return ProviderTurn(response_id, text="I checked the live campus data and completed the request.")


@pytest.fixture
def agent_client(tmp_path: Path):
    provider = CampusFakeProvider()
    settings = Settings(database_url=f"sqlite:///{(tmp_path / 'agent.db').as_posix()}")
    app = create_app(settings, provider)
    with TestClient(app) as client:
        yield client, provider, app


@pytest.mark.parametrize("query,expected_tools", [
    ("When is my next class?", {"get_my_schedules","get_announcements"}),
    ("What classes do I have on Wednesday?", {"get_my_schedules"}),
    ("What assignments do I have due this week?", {"get_my_assignments"}),
    ("Show me all high priority announcements.", {"get_announcements"}),
    ("I'm free until 2 PM — is there anything on campus I could drop into?", {"get_my_schedules","get_events"}),
    ("Which labs have a projector and can fit at least 30 people?", {"list_rooms"}),
    ("I need a room for 5 people with a projector, tomorrow between 2 and 4 PM.", {"find_available_rooms"}),
])
def test_published_read_queries_use_registered_live_tools(agent_client, query, expected_tools):
    client, _, _ = agent_client
    response = client.post("/api/v1/agent/messages", json={"message":query})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "completed"
    assert {trace["name"] for trace in body["tool_calls"]} == expected_tools
    assert all(trace["status"] == "succeeded" for trace in body["tool_calls"])


@pytest.mark.parametrize("message", ["Book a room tomorrow.", "Book a room tomorrow from 3 PM to 5 PM for study."])
def test_vague_booking_clarifies_and_performs_no_write(agent_client, message):
    client, provider, app = agent_client
    response = client.post("/api/v1/agent/messages", json={"message":message})
    assert response.json()["status"] == "needs_clarification"
    assert response.json()["tool_calls"] == []
    assert provider.seen_instructions == []
    with app.state.session_factory() as session:
        assert session.scalar(select(func.count()).select_from(Booking)) == 3


def test_explicit_booking_and_registration_use_command_tools(agent_client):
    client, _, _ = agent_client
    booking = client.post("/api/v1/agent/messages", json={"message":"Book Room 7A02 tomorrow from 3 PM to 5 PM for group study."}).json()
    assert booking["status"] == "completed"
    assert booking["tool_calls"][0]["name"] == "book_room"
    assert "purpose" not in (booking["tool_calls"][0]["arguments"] or {})
    registration = client.post("/api/v1/agent/messages", json={"message":"Register me for the Guest Lecture on Deep Learning."}).json()
    assert registration["status"] == "failed"
    assert [t["name"] for t in registration["tool_calls"]] == ["get_events", "register_event"]
    assert registration["tool_calls"][-1]["result_summary"] == "Failed: ALREADY_REGISTERED"


def test_server_injects_trusted_time_and_no_records_in_prompt(agent_client):
    client, provider, _ = agent_client
    client.post("/api/v1/agent/messages", json={"message":"What classes do I have on Wednesday?", "timezone":"UTC"})
    prompt = provider.seen_instructions[0]
    assert "Asia/Dhaka" in prompt
    assert "CSE 4113" not in prompt and "7A07" not in prompt


def test_only_bounded_registered_tools_are_exposed(agent_client):
    client, provider, _ = agent_client
    client.post("/api/v1/agent/messages", json={"message":"When is my next class?"})
    # The provider receives no generic SQL or official-data mutation capability.
    from app.agent.tools import tool_definitions
    names = {tool["name"] for tool in tool_definitions()}
    assert "execute_sql" not in names
    assert not names.intersection({"create_schedule", "update_event", "delete_announcement"})


def test_dashboard_edit_is_visible_to_next_agent_tool_call(agent_client):
    client, _, _ = agent_client
    assert client.patch("/api/v1/events/evt-007", json={"name":"Renamed Live Event"}).status_code == 200
    response = client.post("/api/v1/agent/messages", json={"message":"What is the edited event called?"})
    assert "Renamed Live Event" in response.json()["reply"]


class BrokenProvider:
    def respond(self, **_kwargs): raise TimeoutError("secret provider detail")


def test_provider_failure_is_safe_and_user_facing(tmp_path: Path):
    app = create_app(Settings(database_url=f"sqlite:///{(tmp_path / 'broken.db').as_posix()}"), BrokenProvider())
    with TestClient(app) as client:
        response = client.post("/api/v1/agent/messages", json={"message":"When is my next class?"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "AGENT_UNAVAILABLE"
    assert "secret" not in response.text


class PartialFailureProvider:
    def respond(self, *, input_items, **_kwargs):
        if isinstance(input_items, str):
            return ProviderTurn(
                "partial-1",
                tool_calls=[
                    ToolRequest(
                        "book-then-fail",
                        "book_room",
                        {
                            "room_id": "room-002",
                            "date": "2026-09-05",
                            "start_time": "15:00",
                            "end_time": "17:00",
                            "purpose": "Group study",
                        },
                    ),
                    ToolRequest("unknown", "unknown_tool", {}),
                ],
            )
        return ProviderTurn("partial-2", text="One requested action failed.")


def test_failed_agent_turn_rolls_back_earlier_mutation(tmp_path: Path):
    app = create_app(
        Settings(database_url=f"sqlite:///{(tmp_path / 'rollback.db').as_posix()}"),
        PartialFailureProvider(),
    )
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/agent/messages",
            json={
                "message": (
                    "Book Room 7A02 tomorrow from 3 PM to 5 PM for group study."
                )
            },
        )
        assert response.json()["status"] == "failed"
        with app.state.session_factory() as session:
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(Booking)
                    .where(Booking.room_id == "room-002")
                )
                == 0
            )


def test_gemini_adapter_round_trips_native_function_calls():
    from google.genai import types

    tool_content = types.Content(role="model", parts=[types.Part.from_function_call(name="get_events", args={"on_date":"2026-09-04"})])
    text_content = types.Content(role="model", parts=[types.Part.from_text(text="One event is available.")])
    responses = [types.GenerateContentResponse(candidates=[types.Candidate(content=tool_content)]),
                 types.GenerateContentResponse(candidates=[types.Candidate(content=text_content)])]

    class Models:
        def __init__(self): self.calls = []
        def generate_content(self, **kwargs):
            self.calls.append(kwargs)
            return responses.pop(0)
    class Client:
        def __init__(self): self.models = Models()

    provider = GeminiProvider.__new__(GeminiProvider)
    provider._types, provider._client, provider._model = types, Client(), "gemini-2.5-flash"
    provider._histories, provider._call_names = {}, {}
    definitions = [{"type":"function", "name":"get_events", "description":"Get events",
                    "parameters":{"type":"object","properties":{"on_date":{"type":"string"}},"required":["on_date"],"additionalProperties":False}}]
    first = provider.respond(instructions="Use tools", input_items="Events?", tools=definitions)
    assert first.tool_calls[0].name == "get_events"
    second = provider.respond(instructions="Use tools", input_items=[{"type":"function_call_output",
        "call_id":first.tool_calls[0].call_id, "output":json.dumps([{"id":"evt-test"}])}],
        tools=definitions, previous_response_id=first.response_id)
    assert second.text == "One event is available."
    sent_history = provider._client.models.calls[1]["contents"]
    assert [content.role for content in sent_history[:3]] == ["user", "model", "tool"]
