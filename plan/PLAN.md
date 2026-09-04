# CampusOS — Unified Team Implementation Plan

This document unifies the implementation plans and responsibilities for all three team members into a single reference.

---

## Table of Contents

1. [System Architecture & Team Division](#system-architecture--team-division)
2. [Member 1 — Frontend (React) Plan](#member-1--frontend-react)
3. [Member 2 — Backend (Express + Supabase) Plan](#member-2--backend-express--supabase)
4. [Member 3 — AI Agent (Tool Calling, Reasoning & Live Data) Plan](#member-3--ai-agent)
5. [End-to-End Integration & Milestone Roadmap](#end-to-end-integration--milestone-roadmap)

---

## System Architecture & Team Division

```
campusos/
│
├── plan/
│   ├── PLAN.md                      ← Unified team plan (this document)
│   ├── Member1.md                   ← Member 1 standalone plan
│   ├── Member2.md                   ← Member 2 standalone plan
│   └── Member3.md                   ← Member 3 standalone plan
│
├── server/                          ← Express backend (Member 2)
│   ├── src/
│   │   ├── routes/                  ← REST API endpoints
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── db/                      ← Supabase client + seed script
│   │   └── agent/                   ← Tool definitions + agent orchestration (Member 3)
│   ├── .env.example
│   └── package.json
│
└── client/                          ← React frontend (Member 1)
    ├── src/
    │   ├── pages/                   ← 5 dashboard sections
    │   ├── components/              ← UI components & state
    │   ├── chat/                    ← Agent chat widget
    │   └── api/                     ← API client (Member 2 endpoints)
    └── package.json
```

---

## Member 1 — Frontend (React)

### Mission
Build the **entire client-facing surface** of CampusOS: the dashboard that lets a user fully manage the five campus systems, and the chat interface the student uses to talk to the AI agent. Everything you build is a thin client over Member 2's Express API — you never store data locally beyond what's needed to render the current screen.

This role is worth the **CRUD Operations (20 marks)** and **UI/UX (20 marks)** criteria directly, and contributes to **Data Management (20 marks)**.

### Tech Stack
- **React** (Vite scaffold, functional components + hooks)
- **TanStack Query (React Query)**: for live reads and automatic cache invalidation
- **React Router**: for the 5 dashboard sections + chat page
- **Styling**: Tailwind CSS / Vanilla CSS with cohesive design system
- `fetch`/`axios` wrapped in a single `src/api/client.js` that talks to Member 2's Express server

### Part A — The Five-System Dashboard
Build one section per system, each with a **list view**, **add form**, **edit form**, and **delete action**. Base every field on `schema.md` exactly:

1. **Schedules**
   - List: course, title, day, start–end time, room, instructor, section
   - Add/Edit form fields: `course`, `title`, `day` (dropdown: Sunday–Thursday only, per AUST week), `start_time`, `end_time` (time pickers, 24h), `room`, `instructor`, `section`
   - Delete = "cancel a class" per the brief

2. **Rooms**
   - List: room_number, type, capacity, equipment (chips), floor, status, and current bookings
   - Add/Edit form fields: `room_number`, `type` (classroom/lab/seminar), `capacity`, `equipment` (multi-select: projector, AC, whiteboard, etc.), `floor`, `status`
   - **Extra actions beyond CRUD:**
     - **Book**: form for `date`, `start_time`, `end_time`, `booked_by`, `purpose` → calls the book endpoint; show error if slot conflicts
     - **Cancel booking**: remove a booking from a room's list

3. **Events**
   - List: name, date/time range, venue, organizer, capacity vs. registered count, status
   - Add/Edit form fields: `name`, `description`, `date`, `start_time`, `end_time`, `end_date`, `venue`, `organizer`, `capacity`
   - **Extra actions:**
     - **Register**: add a student (`student_id`, `name`) to `registrations`; disable/hide button once `registered === capacity` and show status `"full"`
     - **Cancel registration**: remove a student from the list

4. **Announcements**
   - List: title, date, priority (badge, color-coded: high=red, medium=yellow, low=gray), posted_by, expiry — visually flag/gray-out anything past `expires`
   - Add/Edit/Delete on all fields from `schema.md`

5. **Assignments**
   - List: course, title, deadline, status (badge), marks — sort by nearest deadline by default, visually flag overdue ones
   - Add/Edit/Delete on all fields from `schema.md`

#### Cross-cutting dashboard requirements:
- **No manual refresh, ever:** Every mutation invalidates queries immediately.
- **Persistence is visible:** Changes persist across page reloads.
- **Validation before submit:** Required fields, valid time formats, `end_time > start_time`, capacity > 0.

### Part B — Agent Chat Widget
- Chat panel where students type natural-language queries.
- Sends message to `POST /api/agent/chat` and renders the response.
- Shows rich action cards (e.g. "Booked 7A02, tomorrow 3–5 PM").
- Renders clarifying questions naturally in the conversation turn.
- Maintains conversation history (`role`, `content`) for context.
- Invalidates relevant dashboard queries when the agent mutates data.

### Part C — UI/UX Design Requirements
- Clear navigation between systems + chat.
- Empty, loading, and error states for every list and mutation.
- Consistent color system for priorities and statuses across all screens.

---

## Member 2 — Backend (Express + Supabase)

### Mission
Build the **single source of truth** for CampusOS: a Supabase (Postgres) database seeded from the provided JSON files, and an Express API that both the React dashboard (Member 1) and the AI agent (Member 3) call for every read and write. Nothing in this app is allowed to read stale or cached data.

This role is the backbone of **Data Management (20 marks)** and **CRUD Operations (20 marks)**, and is directly responsible for the agent's **"always uses latest data" (10 of the 40 AI Agent marks)**.

### Tech Stack
- **Express.js** on Node.js
- **Supabase** (hosted Postgres) via `@supabase/supabase-js`, using the service role key on the server
- Direct database queries on every GET — no stale caching

### Part A — Database Schema (Supabase / Postgres)
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

- **Seed script**: `server/src/db/seed.js` (`npm run seed`) reads `data/*.json` and idempotently upserts.

### Part B — REST API Endpoints
```
Schedules:
  GET    /api/schedules
  POST   /api/schedules
  PUT    /api/schedules/:id
  DELETE /api/schedules/:id

Rooms:
  GET    /api/rooms (supports ?date=&start_time=&end_time=&min_capacity=&equipment=&type=)
  POST   /api/rooms
  PUT    /api/rooms/:id
  DELETE /api/rooms/:id
  POST   /api/rooms/:id/book
  DELETE /api/rooms/:id/bookings/:bookingId

Events:
  GET    /api/events
  POST   /api/events
  PUT    /api/events/:id
  DELETE /api/events/:id
  POST   /api/events/:id/register
  DELETE /api/events/:id/registrations/:studentId

Announcements:
  GET    /api/announcements
  POST   /api/announcements
  PUT    /api/announcements/:id
  DELETE /api/announcements/:id

Assignments:
  GET    /api/assignments
  POST   /api/assignments
  PUT    /api/assignments/:id
  DELETE /api/assignments/:id

Agent & Utility:
  GET    /api/meta/now
  POST   /api/agent/chat
```

### Business Logic
- **Room conflict detection**: Reject (409) if `[start_time, end_time)` overlaps any existing booking for that room & date.
- **Room search filter**: Filter by capacity, equipment, availability during a window.
- **Event capacity enforcement**: Reject (409) when full, auto-update `status` to `"full"`.
- **Structured error responses**: `{ error: "code", message: "details" }`.

---

## Member 3 — AI Agent

### Mission
Build the AI agent that sits behind `POST /api/agent/chat` on Member 2's server: an LLM wired up with **real function/tool calling** against Member 2's REST API, able to look things up, combine info across systems, take actions, ask for clarification when a request is vague, and refuse when a request is unauthorized.

This role owns all **40 AI Agent marks**: correctness (10), correct actions (10), live data (10), vague/unauthorized handling (10).

### Where This Lives
`server/src/agent/` inside the Express app.

### Part A — Tool Definitions
- **Read tools**:
  - `get_schedule({ day? })`
  - `get_assignments({ status?, due_before? })`
  - `get_announcements({ priority?, active_only? })`
  - `get_events({ status?, after?, before? })`
  - `search_rooms({ date?, start_time?, end_time?, min_capacity?, equipment?, type? })`
  - `get_current_datetime()` → `GET /api/meta/now`
- **Action tools**:
  - `book_room({ room_number, date, start_time, end_time, booked_by, purpose })`
  - `cancel_booking({ room_number, booking_id })`
  - `register_for_event({ event_name_or_id, student_id, name })`
  - `cancel_registration({ event_name_or_id, student_id })`

### Part B — Query Handling & Reasoning
- **Simple Lookups**: Use `get_current_datetime` + domain read tools. Filter expired/past items appropriately.
- **Multi-Source Reasoning**: Cross-reference between schedules, free time, events, and room filters.
- **Actions**: If fully specified, call action tool directly.
- **Deliberately-Messy / Vague Queries**: When details are missing (e.g. "Just book me any room tomorrow afternoon"), ask a short, specific clarifying question before calling write tools.
- **Unauthorized Requests**: Refuse requests to bypass limits, delete arbitrary data, or access out-of-scope info.

---

## End-to-End Integration & Milestone Roadmap

| Milestone | Goal | Owner | Deliverable |
|---|---|---|---|
| **M1** | API contract agreed + repo scaffolded | All | Finalize routes; scaffold `client/` and `server/` |
| **M2** | Supabase schema live + seed script | Member 2 | Tables created; `npm run seed` working |
| **M3** | Core CRUD API complete | Member 2 | All 5 resources working via Postman/curl |
| **M4** | Dashboard read views | Member 1 | 5 sections rendering live data |
| **M5** | Dashboard CRUD wired up | Member 1 | UI add/edit/delete persisted |
| **M6** | Booking & registration logic | Member 2 | Conflict detection & capacity enforcement |
| **M7** | Booking & registration UI | Member 1 | Book/cancel & register/cancel UI flows |
| **M8** | Agent read tools | Member 3 | Query lookup and multi-source reasoning |
| **M9** | Agent action tools | Member 3 | Booking and registration actions |
| **M10** | Vague & refusal handling | Member 3 | Clarification and safety checks |
| **M11** | Chat UI integration | Member 1 + Member 3 | Chat widget connected to `/api/agent/chat` |
| **M12** | Live-edit validation | All | Modify data in dashboard → verify agent response |
| **M13** | Polish + UI/UX pass | Member 1 | Loading/empty/error states & consistent styling |
