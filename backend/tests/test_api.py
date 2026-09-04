from pathlib import Path
import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings
from app.schemas import (AnnouncementResponse, AssignmentResponse, BookingResponse, ErrorResponse,
                         EventResponse, RegistrationResponse, RoomResponse, ScheduleResponse, UserResponse)


@pytest.fixture
def client(tmp_path: Path):
    app = create_app(Settings(database_url=f"sqlite:///{(tmp_path / 'api.db').as_posix()}", cors_origins=["http://localhost:5173"]))
    with TestClient(app) as test_client:
        yield test_client


def test_health_seed_and_current_user(client: TestClient):
    assert client.get("/health").json() == {"status": "ok"}
    user = client.get("/api/v1/users/me")
    assert user.status_code == 200
    assert user.json()["id"] == "usr-001"
    assert client.get("/api/v1/schedules").json()["total"] == 24


@pytest.mark.parametrize("resource", ["schedules", "rooms", "events", "announcements", "assignments"])
def test_every_crud_method_is_exposed_in_openapi(client: TestClient, resource: str):
    paths = client.get("/openapi.json").json()["paths"]
    assert {"get", "post"}.issubset(paths[f"/api/v1/{resource}"])
    assert {"get", "patch", "delete"}.issubset(paths[f"/api/v1/{resource}/{{item_id}}"])


CRUD_CASES = [
    ("schedules", {"course":"CSE 9999","title":"API Test","day":"Thursday","start_time":"18:00","end_time":"19:00","room":"X1","instructor":"Tester","section":"Z"}, {"title":"Updated"}),
    ("rooms", {"room_number":"X200","type":"lab","capacity":20,"equipment":["GPU"],"floor":2,"status":"available"}, {"capacity":25}),
    ("events", {"name":"API Event","description":"Test","date":"2026-09-20","start_time":"10:00","end_time":"11:00","end_date":"2026-09-20","venue":"X200","organizer":"Test","capacity":10,"status":"upcoming"}, {"name":"Updated"}),
    ("announcements", {"title":"API Notice","body":"Test","date":"2026-09-04","priority":"low","posted_by":"Test","expires":"2026-09-05"}, {"title":"Updated"}),
    ("assignments", {"course":"CSE 4113","course_title":"PRML","title":"API Task","description":"Test","assigned_date":"2026-09-04","deadline":"2026-09-20","submission_platform":"Classroom","status":"pending","marks":10}, {"title":"Updated"}),
]


@pytest.mark.parametrize(("resource", "payload", "patch"), CRUD_CASES)
def test_crud_round_trip(client: TestClient, resource: str, payload: dict, patch: dict):
    created = client.post(f"/api/v1/{resource}", json=payload)
    assert created.status_code == 201, created.text
    item_id = created.json()["id"]
    assert client.get(f"/api/v1/{resource}/{item_id}").status_code == 200
    updated = client.patch(f"/api/v1/{resource}/{item_id}", json=patch)
    assert updated.status_code == 200, updated.text
    assert all(updated.json()[key] == value for key, value in patch.items())
    assert client.delete(f"/api/v1/{resource}/{item_id}").json() == {"id": item_id, "deleted": True}
    assert client.get(f"/api/v1/{resource}/{item_id}").status_code == 404


def test_personalized_and_filtered_reads(client: TestClient):
    assert client.get("/api/v1/users/me/schedules").json()["total"] == 24
    assert client.get("/api/v1/users/me/assignments").json()["total"] == 8
    assert client.get("/api/v1/users/me/announcements", params={"on_date":"2026-09-04"}).json()["total"] > 0
    assert client.get("/api/v1/users/me/events", params={"on_date":"2026-09-04"}).json()["total"] == 7
    assert client.get("/api/v1/rooms", params={"equipment":"smart board"}).json()["total"] == 3
    assert client.get("/api/v1/assignments", params={"due_to":"2026-09-09"}).json()["total"] == 3


def test_booking_availability_idempotency_and_cancellation(client: TestClient):
    query = {"date":"2026-09-05", "start_time":"09:00", "end_time":"10:00"}
    assert "room-001" in {r["id"] for r in client.get("/api/v1/rooms/availability", params=query).json()["items"]}
    payload = {"booked_by":"Spoofed", **query, "purpose":"Study"}
    headers = {"Idempotency-Key":"api-booking"}
    first = client.post("/api/v1/rooms/room-001/bookings", json=payload, headers=headers)
    second = client.post("/api/v1/rooms/room-001/bookings", json=payload, headers=headers)
    assert first.status_code == second.status_code == 201
    assert first.json() == second.json()
    assert first.json()["booked_by"] == "Sakibul Hassan"
    booking_id = first.json()["booking_id"]
    assert client.delete(f"/api/v1/rooms/room-001/bookings/{booking_id}").status_code == 200


def test_registration_and_cancellation(client: TestClient):
    payload = {"student_id":"99-99999", "name":"Spoofed"}
    response = client.post("/api/v1/events/evt-007/registrations", json=payload, headers={"Idempotency-Key":"api-registration"})
    assert response.status_code == 201
    assert response.json()["student_id"] == "20-40532"
    assert client.delete("/api/v1/events/evt-007/registrations/20-40532").status_code == 200


def test_standard_error_envelopes(client: TestClient):
    missing = client.get("/api/v1/events/evt-missing")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "NOT_FOUND"
    invalid = client.post("/api/v1/rooms", json={})
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "VALIDATION_ERROR"
    duplicate = client.post("/api/v1/rooms", json={"room_number":"7A01","type":"lab","capacity":20,"equipment":[],"floor":2,"status":"available"})
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "CONFLICT"
    agent = client.post("/api/v1/agent/messages", json={"message":"Hello"})
    assert agent.status_code == 503
    assert agent.json()["error"]["code"] == "AGENT_UNAVAILABLE"


def test_local_cors(client: TestClient):
    response = client.options("/api/v1/rooms", headers={"Origin":"http://localhost:5173", "Access-Control-Request-Method":"GET"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_frontend_mock_fixtures_match_contracts():
    fixture_path = Path(__file__).parents[1] / "mocks" / "api_v1.json"
    fixtures = json.loads(fixture_path.read_text(encoding="utf-8"))
    schemas = {"user": UserResponse, "schedule": ScheduleResponse, "room": RoomResponse,
               "event": EventResponse, "announcement": AnnouncementResponse,
               "assignment": AssignmentResponse, "booking": BookingResponse,
               "registration": RegistrationResponse, "error": ErrorResponse}
    for name, schema in schemas.items():
        schema.model_validate(fixtures[name])
