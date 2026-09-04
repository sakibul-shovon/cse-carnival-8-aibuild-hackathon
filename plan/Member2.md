# Member 2 — Backend (Express + Supabase) — API, Database & Business Logic

## Your Mission

Build the **single source of truth** for CampusOS: a Supabase (Postgres) database seeded from the provided JSON files, and an Express API that both the React dashboard (Member 1) and the AI agent (Member 3) call for every read and write. Nothing in this app is allowed to read stale or cached data — you are the piece that guarantees that.

This role is the backbone of **Data Management (20 marks)** and **CRUD Operations (20 marks)**, and is directly responsible for the agent's **"always uses latest data" (10 of the 40 AI Agent marks)**.

---

## Tech Stack

- **Express.js** on Node.js
- **Supabase** (hosted Postgres) via `@supabase/supabase-js`, using the **service role key** on the server (never exposed to the frontend)
- No in-memory caching layer, no read-through cache — every GET hits Supabase directly. This is a deliberate simplicity choice: it's the only way to guarantee the "live data" requirement without extra invalidation machinery.

---

## Part A — Database Schema (Supabase / Postgres)

Create one table per system, mirroring `schema.md` field-for-field. Suggested DDL shape (adjust types as needed, keep field **names** identical to the schema doc so Member 1 and Member 3 don't have to translate):

```sql
create table schedules (
  id text primary key,
  course text not null,
  title text not null,
  day text not null check (day in ('Sunday','Monday','Tuesday','Wednesday','Thursday')),
  start_time text not null,
  end_time text not null,
  room text not null,
  instructor text,
  section text
);

create table rooms (
  id text primary key,
  room_number text unique not null,
  type text not null check (type in ('classroom','lab','seminar')),
  capacity integer not null,
  equipment text[] default '{}',
  floor integer,
  status text not null default 'available'
);

create table bookings (
  booking_id text primary key,
  room_id text references rooms(id) on delete cascade,
  booked_by text not null,
  date date not null,
  start_time text not null,
  end_time text not null,
  purpose text
);

create table events (
  id text primary key,
  name text not null,
  description text,
  date date not null,
  start_time text not null,
  end_time text not null,
  end_date date,
  venue text,
  organizer text,
  capacity integer not null,
  registered integer not null default 0,
  status text not null default 'upcoming'
);

create table event_registrations (
  event_id text references events(id) on delete cascade,
  student_id text not null,
  name text not null,
  primary key (event_id, student_id)
);

create table announcements (
  id text primary key,
  title text not null,
  body text,
  date date not null,
  priority text not null check (priority in ('high','medium','low')),
  posted_by text,
  expires date
);

create table assignments (
  id text primary key,
  course text not null,
  course_title text,
  title text not null,
  description text,
  assigned_date date,
  deadline date not null,
  submission_platform text,
  status text not null default 'pending',
  marks numeric
);
```

Write a **seed script** (`server/src/db/seed.js`, run via `npm run seed`) that reads `data/*.json` and upserts into these tables **once**, on setup — after that, the JSON files are never touched again. Make the seed idempotent (upsert on primary key) so re-running it during development doesn't duplicate rows.

---

## Part B — REST API

Standard CRUD for all five resources, plus the two "extra action" endpoints the brief calls out explicitly for rooms and events.

```
Schedules
  GET    /api/schedules
  POST   /api/schedules
  PUT    /api/schedules/:id
  DELETE /api/schedules/:id

Rooms
  GET    /api/rooms                       (supports ?date=&start_time=&end_time=&min_capacity=&equipment= filters — the agent needs this for "room for 5 with a projector, tomorrow 2–4")
  POST   /api/rooms
  PUT    /api/rooms/:id
  DELETE /api/rooms/:id
  POST   /api/rooms/:id/book               body: { booked_by, date, start_time, end_time, purpose }
  DELETE /api/rooms/:id/bookings/:bookingId

Events
  GET    /api/events
  POST   /api/events
  PUT    /api/events/:id
  DELETE /api/events/:id
  POST   /api/events/:id/register          body: { student_id, name }
  DELETE /api/events/:id/registrations/:studentId

Announcements
  GET    /api/announcements
  POST   /api/announcements
  PUT    /api/announcements/:id
  DELETE /api/announcements/:id

Assignments
  GET    /api/assignments
  POST   /api/assignments
  PUT    /api/assignments/:id
  DELETE /api/assignments/:id

Agent
  POST   /api/agent/chat                   body: { message, history[] } — see Member3.md
```

### Business logic you own (this is where marks are actually won or lost)

- **Room booking conflict check**: before inserting into `bookings`, query existing bookings for that `room_id` + `date` and reject (409) if the new `[start_time, end_time)` overlaps any existing one. This backs the sample query *"Book Room 7A02 tomorrow from 3 PM to 5 PM"* and the filtered-search query.
- **Room search filter**: `GET /api/rooms` must support filtering by capacity ≥ N, `equipment` contains X, and — combined with `bookings` — free during a given date/time window. This directly powers *"Which labs have a projector and can fit at least 30 people?"* and *"I need a room for 5 people with a projector, tomorrow between 2 and 4."*
- **Event capacity enforcement**: reject registration (409) once `registered === capacity`; auto-set `status = "full"` when capacity is hit, and revert to `"upcoming"`/`"ongoing"` if a registration is cancelled and there's room again.
- **Consistent, honest error responses**: return structured JSON errors (`{ error: "room_unavailable", message: "..." }`) — Member 3's agent needs to relay these to the user in plain language, and Member 1 needs to render them.
- **No caching, no batching that delays writes** — every write must be committed and immediately visible on the very next GET, from any client. This is what makes the hackathon's live "we'll edit data mid-evaluation and ask the agent" test pass or fail.

---

## Part C — Supporting the Agent (works with Member 3)

You don't build the LLM logic, but you own the **tool surface** it calls:
- Keep the API's request/response shapes simple and consistent (flat JSON, predictable field names matching `schema.md`) — this is what gets turned into tool/function definitions.
- Add a couple of read endpoints that make multi-source reasoning queries cheap instead of requiring the agent to make many calls, e.g.:
  - `GET /api/schedules?day=Wednesday`
  - `GET /api/events?status=upcoming&after=<datetime>` (for "free until 2 PM, anything I could drop into")
- Make sure timestamps/dates are unambiguous (ISO 8601 dates, 24h times, as specified in `schema.md`) so the agent doesn't have to guess "today"/"tomorrow" — consider a `GET /api/meta/now` endpoint returning current server date/time so the agent always resolves relative dates against a real clock, not its own guess.

---

## Environment

`server/.env.example`:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=4000
```

## Deliverables Checklist

- [x] Supabase tables created matching `schema.md` field names exactly
- [x] Seed script loads all 5 JSON files once, idempotently
- [x] Full CRUD on all 5 resources, no caching, immediately consistent
- [x] Room booking with real conflict detection
- [x] Room search filterable by capacity/equipment/availability
- [x] Event registration with capacity enforcement + status auto-update
- [x] Structured error responses across all endpoints
- [x] `/api/agent/chat` route scaffolded and handed off to Member 3