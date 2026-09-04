# API documentation

Base URL: `http://localhost:4000/api/v1`

Local requests use `x-user-id` as a development identity override. If omitted, `DEV_USER_ID` is used. This header is not a production authentication mechanism.

## Response envelope

Success:

```json
{ "success": true, "data": {}, "message": "Operation successful" }
```

Error:

```json
{
  "success": false,
  "data": null,
  "message": "Request validation failed",
  "error": { "code": "VALIDATION_ERROR", "details": {} }
}
```

## Endpoints

| Method | Path | Responsibility |
| --- | --- | --- |
| `GET` | `/health` | Process health (outside `/api/v1`) |
| `GET, POST` | `/schedules` | List or create schedules |
| `GET, PATCH, DELETE` | `/schedules/:id` | Read, update, or remove a schedule |
| `GET, POST` | `/rooms` | List or create rooms |
| `GET` | `/rooms/available` | Find conflict-free rooms by date/time/capacity/features |
| `GET, PATCH, DELETE` | `/rooms/:id` | Read, update, or remove a room |
| `POST` | `/rooms/:id/bookings` | Create a validated room booking |
| `GET, POST` | `/events` | List or create events |
| `GET, PATCH, DELETE` | `/events/:id` | Read, update, or remove an event |
| `POST` | `/events/:id/registrations` | Register a user with capacity enforcement |
| `GET, POST` | `/assignments` | List or create assignments |
| `GET, PATCH, DELETE` | `/assignments/:id` | Read, update, or remove an assignment |
| `PATCH` | `/assignments/:id/status` | Update current student submission status |
| `GET, POST` | `/announcements` | List or create announcements |
| `GET, PATCH, DELETE` | `/announcements/:id` | Read, update, or remove an announcement |
| `GET, POST` | `/users` | List or create users |
| `GET, PATCH, DELETE` | `/users/:id` | Read, update, or remove a user |
| `GET, POST` | `/notifications` | List or create notifications |
| `GET, PATCH, DELETE` | `/notifications/:id` | Read, update, or remove a user-scoped notification |
| `GET` | `/ai/tools` | List AI-visible tools |
| `POST` | `/ai/chat` | Send a message to the campus assistant |
| `DELETE` | `/ai/sessions/:sessionId` | Clear bounded local AI history |

## Query examples

Find a projector-equipped lab for 30 people:

```http
GET /api/v1/rooms/available?date=2026-09-07&startTime=14:00&endTime=16:00&minCapacity=30&type=LAB&features=projector
```

Get Wednesday classes for the demo student:

```http
GET /api/v1/schedules?day=WEDNESDAY&userId=20-40532
```

Ask the AI assistant:

```http
POST /api/v1/ai/chat
Content-Type: application/json

{ "message": "What assignments are due this week?", "sessionId": "browser-session-123" }
```

Dates sent to mutation endpoints are ISO 8601 date-times. Room availability uses `YYYY-MM-DD` dates and `HH:mm` 24-hour times.
