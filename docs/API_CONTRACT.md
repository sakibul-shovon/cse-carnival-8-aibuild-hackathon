# CampusOS API Contract v1

Status: **implementation contract**  
Base path: `/api/v1`  
Media type: `application/json`  
Default timezone: `Asia/Dhaka`

The dashboard and AI agent are two clients of this API. Neither client reads or
writes seed JSON directly. The database and shared service layer are the single
source of truth.

The executable request and response types live in `backend/app/schemas/`. Those
Pydantic v2 models are authoritative when prose and code disagree.

## Contract conventions

- Dates are ISO `YYYY-MM-DD` strings.
- Times are strict 24-hour `HH:MM` strings.
- Unknown request fields are rejected.
- The server generates stable prefixed IDs; clients never send an `id` on create.
- `PATCH` uses partial objects, but an empty object is invalid. The service merges
  the patch with the stored object and validates the complete result.
- List responses use `{ "items": [...], "total": n }`.
- Deletes return `{ "id": "...", "deleted": true }`.
- All writes return the committed database representation, not the submitted body.
- `409 Conflict` is used when valid input cannot be applied to current state.

## Errors

All non-2xx responses have one shape:

```json
{
  "error": {
    "code": "ROOM_UNAVAILABLE",
    "message": "Room 7A02 is not available during the requested period.",
    "details": {
      "room_id": "room-002",
      "conflicting_booking_id": "bk-104"
    }
  }
}
```

| HTTP | Meaning | Typical codes |
|---|---|---|
| 400 | Malformed query or business-invalid request | `VALIDATION_ERROR` |
| 403 | Authenticated user is not allowed to act | `FORBIDDEN` |
| 404 | Resource does not exist | `NOT_FOUND` |
| 409 | State conflict or duplicate action | `CONFLICT`, `ROOM_UNAVAILABLE`, `EVENT_FULL`, `ALREADY_REGISTERED` |
| 422 | Request body failed schema validation | `VALIDATION_ERROR` |
| 503 | LLM provider unavailable after bounded retry | `AGENT_UNAVAILABLE` |

FastAPI's default 422 body must be converted to this common envelope.

## Standard CRUD resources

Each resource supports:

| Method | Path | Success |
|---|---|---|
| `GET` | `/{resource}` | `200`, list response |
| `GET` | `/{resource}/{id}` | `200`, resource response |
| `POST` | `/{resource}` | `201`, created resource response |
| `PATCH` | `/{resource}/{id}` | `200`, updated resource response |
| `DELETE` | `/{resource}/{id}` | `200`, delete response |

Resources are `schedules`, `rooms`, `events`, `announcements`, and `assignments`.
Bookings and registrations are changed only through their command endpoints; a
generic room or event patch cannot overwrite their nested arrays or counters.

## Current user and relevance

```http
GET /api/v1/users/me
```

Response for the hackathon's seeded demo session:

```json
{
  "id": "usr-001",
  "student_id": "20-40532",
  "name": "Sakibul Hassan",
  "department": "CSE",
  "role": "student",
  "enrollments": [
    {"course": "CSE 4113", "section": "B"},
    {"course": "CSE 4173", "section": "CS"}
  ]
}
```

The MVP runs as this one trusted demo user; it does not pretend to provide full
authentication. The backend attaches this identity to each request. The browser
and LLM cannot choose a different `student_id` or elevate `role`.

Relevance is deterministic:

- Classes match both enrolled `course` and `section`.
- Assignments match enrolled `course`, because the supplied assignment schema has
  no section field. The supplied `status` is treated as the demo user's status.
- Announcements are campus-wide and relevant while `date <= today <= expires`;
  audience is not inferred from prose.
- Upcoming, ongoing, and full events remain discoverable until `end_date`. Event
  registration is user-specific through `student_id`.
- Room relevance depends on operational status, capacity, equipment, and time
  availability rather than enrollment.

These rules are implemented as pure functions in `backend/app/services/relevance.py`
so REST routes and agent tools cannot silently apply different filters.

The personalized read endpoints are:

| Method | Path | Response |
|---|---|---|
| `GET` | `/users/me/schedules` | `ScheduleListResponse` |
| `GET` | `/users/me/assignments` | `AssignmentListResponse` |
| `GET` | `/users/me/announcements?on_date=2026-09-04` | `AnnouncementListResponse` |
| `GET` | `/users/me/events?on_date=2026-09-04` | `EventListResponse` |

`on_date` defaults to the backend's current date in `Asia/Dhaka`. Agent tools use
these same service operations. Generic resource endpoints remain available to the
admin dashboard, but must not be used to answer “my” questions.

### Schedule

Create request:

```json
{
  "course": "CSE 4113",
  "title": "Pattern Recognition and Machine Learning",
  "day": "Sunday",
  "start_time": "13:00",
  "end_time": "13:50",
  "room": "7A07",
  "instructor": "Prof. Dr. Md. Shahriar Mahbub",
  "section": "B"
}
```

Response adds `"id": "sch-025"`. `day` is limited to Sunday through Thursday,
and `end_time` must be later than `start_time`.

Optional list filters: `day`, `course`, `room`. Default ordering is weekday order,
then `start_time`, then `id`.

### Room

Create request:

```json
{
  "room_number": "7A08",
  "type": "classroom",
  "capacity": 40,
  "equipment": ["whiteboard", "projector", "AC"],
  "floor": 7,
  "status": "available"
}
```

Response adds `id` and `bookings: []`. `room_number` must be unique. Capacity must
be positive. `type` is `classroom`, `lab`, or `seminar`; `status` is `available`
or `unavailable`.

Optional list filters: `type`, `status`, `min_capacity`, and repeated `equipment`.
Equipment matching is case-insensitive but responses preserve stored spelling.

### Event

Create request:

```json
{
  "name": "Database Study Circle",
  "description": "An open revision session.",
  "date": "2026-09-08",
  "start_time": "10:00",
  "end_time": "12:00",
  "end_date": "2026-09-08",
  "venue": "7C03",
  "organizer": "CSE Department",
  "capacity": 55,
  "status": "upcoming"
}
```

Response adds `id`, `registered: 0`, and `registrations: []`. A single-day event
must end after it starts. A multi-day event may use the same start and end time.
Capacity may not be patched below the current registered count.

Optional list filters: `date_from`, `date_to`, `status`, `venue`. Default ordering
is `date`, `start_time`, then `id`.

### Announcement

Create request:

```json
{
  "title": "Lab moved",
  "body": "The CSE 4130 lab has moved to 7B05.",
  "date": "2026-09-04",
  "priority": "high",
  "posted_by": "CSE Department",
  "expires": "2026-09-10"
}
```

`priority` is `high`, `medium`, or `low`; `expires` cannot precede `date`.
Optional list filters: `priority`, `active_on`, `posted_by`. `active_on` includes
records where `date <= active_on <= expires`.

### Assignment

Create request:

```json
{
  "course": "CSE 4113",
  "course_title": "Pattern Recognition and Machine Learning",
  "title": "Assignment 2",
  "description": "Implement a decision tree.",
  "assigned_date": "2026-09-04",
  "deadline": "2026-09-12",
  "submission_platform": "Google Classroom",
  "status": "pending",
  "marks": 10
}
```

`status` is `pending`, `submitted`, `graded`, or `late`; the deadline cannot
precede the assigned date. Optional filters: `course`, `status`, `due_from`, and
`due_to`. Default ordering is `deadline`, then `id`.

## Room availability and booking commands

### Search availability

```http
GET /api/v1/rooms/availability?date=2026-09-05&start_time=14:00&end_time=16:00&capacity=5&equipment=projector
```

Response:

```json
{
  "items": [
    {
      "id": "room-001",
      "room_number": "7A01",
      "type": "classroom",
      "capacity": 40,
      "equipment": ["whiteboard", "projector", "AC"],
      "floor": 7,
      "status": "available",
      "bookings": []
    }
  ],
  "total": 1
}
```

A room is available only when it is operational and the interval does not overlap
either a dated booking or a recurring class meeting on that date's weekday.
Intervals are half-open: `[start_time, end_time)`, so back-to-back reservations
are allowed.

### Book a room

```http
POST /api/v1/rooms/room-002/bookings
Idempotency-Key: 09cd9b9b-5eba-4421-95d6-d745a739f93f
```

```json
{
  "booked_by": "Sakibul Hassan",
  "date": "2026-09-05",
  "start_time": "15:00",
  "end_time": "17:00",
  "purpose": "Group study"
}
```

Success is `201` with the booking plus server-generated `booking_id`. The service
must recheck conflicts and insert atomically. Repeating the same idempotency key
returns the original success and must not create a duplicate booking.

### Cancel a booking

```http
DELETE /api/v1/rooms/room-002/bookings/bk-104
```

Only an admin or the booking owner may cancel it. Success returns:

```json
{"id":"bk-104","deleted":true}
```

## Event registration commands

### Register

```http
POST /api/v1/events/evt-002/registrations
Idempotency-Key: ddfe4604-0c7f-4df5-8d3e-e5834180174e
```

```json
{
  "student_id": "20-40532",
  "name": "Sakibul Hassan"
}
```

Success is `201` with the saved registration. The transaction checks event state,
capacity, and duplicate student ID, then inserts and increments `registered`.

### Cancel registration

```http
DELETE /api/v1/events/evt-002/registrations/20-40532
```

Only an admin or that student may cancel. Success returns:

```json
{"id":"20-40532","deleted":true}
```

## Agent contract

```http
POST /api/v1/agent/messages
```

Request:

```json
{
  "conversation_id": null,
  "message": "Book Room 7A02 tomorrow from 3 PM to 5 PM.",
  "timezone": "Asia/Dhaka"
}
```

Completed response:

```json
{
  "conversation_id": "conv-001",
  "reply": "Room 7A02 is booked tomorrow from 3:00 PM to 5:00 PM.",
  "status": "completed",
  "tool_calls": [
    {
      "name": "book_room",
      "status": "succeeded",
      "arguments": {
        "room_number": "7A02",
        "date": "2026-09-05",
        "start_time": "15:00",
        "end_time": "17:00"
      },
      "result_summary": "Created booking bk-104"
    }
  ]
}
```

Clarification response performs no write:

```json
{
  "conversation_id": "conv-002",
  "reply": "What start and end time should I use tomorrow afternoon?",
  "status": "needs_clarification",
  "tool_calls": []
}
```

`status` is `completed`, `needs_clarification`, `refused`, or `failed`. Tool traces
are useful for judging and debugging, but must not expose prompts, API keys, SQL,
or provider internals.

The agent receives the server's current date and timezone. It must use read tools
for every factual answer and command tools for every mutation. Conversation memory
may store dialogue context, but campus records may not be cached there.

## Agent authorization policy

| Action | Student | Admin |
|---|---:|---:|
| Read campus data | Yes | Yes |
| Book an available room | Yes | Yes |
| Cancel own booking | Yes | Yes |
| Register self for event | Yes | Yes |
| Cancel own registration | Yes | Yes |
| Change own assignment status | Yes | Yes |
| Change official schedules, rooms, events, or announcements via agent | No | Yes |
| Delete another user's booking or registration | No | Yes |

For the hackathon demo, identity may come from a fixed seeded session, but it must
come from trusted server-side context in production. The message contract rejects
client-supplied identity and role fields rather than merely ignoring them.

## Seed import decisions

- Seed JSON is imported only when the database is empty; restarts never overwrite
  user changes.
- `data/users.json` supplies the one MVP demo identity and its course-section
  enrollments. Full login, multiple users, semesters, and course registration are
  explicitly outside this hackathon MVP.
- Existing IDs are preserved. New IDs use the same prefixes but are not generated
  by `MAX(id) + 1`, which races; use UUID-derived suffixes or a sequence.
- Existing event `registered` values are authoritative even where the provided
  registration arrays contain only sample identities. New transactions maintain
  both values without rewriting the historical count.
- The supplied assignment `status` is interpreted as the demo user's progress. A
  multi-user version must split assignment definitions from per-user progress.
- Schedule locations missing from the room inventory (`7C07`, `9A05`) remain valid
  display values but cannot be booked until matching room records exist.
- ISO dates are authoritative when natural-language weekday labels inside an
  announcement disagree with them.

## Parallel mocks

Frontend work can begin against a tiny mock server exposing these exact paths and
payloads. The mock must model mutation, conflicts, and persistence; static fixtures
alone cannot test the core requirement. Backend contract tests should serialize
Pydantic responses to JSON and compare their shape with frontend fixtures. Replacing
the mock base URL with the FastAPI base URL must require no component changes.

## Versioning assumptions

Breaking field or semantic changes require `/api/v2`. Adding an optional response
field is non-breaking. Enum additions should still be coordinated because exhaustive
TypeScript switches can break even when the JSON shape does not.
