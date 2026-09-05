# Member 1 — Frontend (React) — Campus Data Manager Dashboard + Agent Chat UI

## Your Mission

Build the **entire client-facing surface** of CampusOS: the dashboard that lets a user fully manage the five campus systems, and the chat interface the student uses to talk to the AI agent. Everything you build is a thin client over Member 2's Express API — you never store data locally beyond what's needed to render the current screen.

This role is worth the **CRUD Operations (20 marks)** and **UI/UX (20 marks)** criteria directly, and contributes to **Data Management (20 marks)**.

---

## Tech Stack

- **React** (Vite scaffold, functional components + hooks)
- A data-fetching library for live reads: **TanStack Query (React Query)** is strongly recommended — it makes "always show live data, no manual refresh" straightforward via automatic refetching/invalidation
- **React Router** for the 5 dashboard sections + chat page
- Styling: your choice (Tailwind CSS recommended for speed), but design intentionally — see "Design Requirements" below
- `fetch`/`axios` wrapped in a single `src/api/client.js` that talks to Member 2's Express server

---

## Part A — The Five-System Dashboard

Build one section per system, each with a **list view**, **add form**, **edit form**, and **delete action**. Base every field on `schema.md` exactly — do not invent or rename fields.

### 1. Schedules
- List: course, title, day, start–end time, room, instructor, section
- Add/Edit form fields: `course`, `title`, `day` (dropdown: Sunday–Thursday only, per AUST week), `start_time`, `end_time` (time pickers, 24h), `room`, `instructor`, `section`
- Delete = "cancel a class" per the brief

### 2. Rooms
- List: room_number, type, capacity, equipment (chips), floor, status, and a way to view that room's current bookings
- Add/Edit form fields: `room_number`, `type` (classroom/lab/seminar), `capacity`, `equipment` (multi-select: projector, AC, whiteboard, etc.), `floor`, `status`
- **Extra actions beyond CRUD (required by the brief):**
  - **Book**: form for `date`, `start_time`, `end_time`, `booked_by`, `purpose` → calls the book endpoint; show a clear error if the slot conflicts with an existing booking
  - **Cancel booking**: remove a booking from a room's list

### 3. Events
- List: name, date/time range, venue, organizer, capacity vs. registered count, status
- Add/Edit form fields: `name`, `description`, `date`, `start_time`, `end_time`, `end_date`, `venue`, `organizer`, `capacity`
- **Extra actions (required):**
  - **Register**: add a student (`student_id`, `name`) to `registrations`; disable/hide the button once `registered === capacity` and show status `"full"`
  - **Cancel registration**: remove a student from the list

### 4. Announcements
- List: title, date, priority (badge, color-coded: high=red, medium=yellow, low=gray), posted_by, expiry — visually flag/gray-out anything past `expires`
- Add/Edit/Delete on all fields from `schema.md`

### 5. Assignments
- List: course, title, deadline, status (badge), marks — sort by nearest deadline by default, visually flag overdue ones
- Add/Edit/Delete on all fields from `schema.md`

### Cross-cutting dashboard requirements
- **No manual refresh, ever.** Every add/edit/delete/book/register must update the visible list immediately (optimistic update or immediate refetch — React Query's `invalidateQueries` after each mutation is the simplest correct approach).
- **Persistence is visible, not assumed.** After any change, a page reload must show the same state — this is what the judges test, so don't fake it with local component state that resets on refresh.
- **Validation before submit**: required fields, correct time format, `end_time > start_time`, capacity is a positive number, etc. Surface backend errors (e.g. "room already booked in that slot") clearly in the UI, not as a silent failure.

---

## Part B — Agent Chat Widget

- A chat panel (dedicated page or persistent side panel) where the student types natural-language queries like the ones in `sample_queries.md`.
- Sends the student's message to Member 2's agent endpoint (e.g. `POST /api/agent/chat`) and streams/renders the reply.
- **Show what the agent did, not just what it said**, where relevant — e.g. if it booked a room, show a small inline confirmation card ("Booked 7A02, tomorrow 3–5 PM") rather than just prose. This makes correctness visible to judges during live testing.
- If the agent asks a clarifying question (e.g. "Which room and time did you mean?"), render it as a normal turn in the conversation — don't special-case it.
- Maintain conversation history client-side for the session (array of `{role, content}`) and send it with each request so the agent has context for follow-ups.
- After the agent takes an action that changes data (booking, registering, editing), **invalidate the relevant dashboard queries** so if the user flips back to the dashboard tab, it already reflects the change — reinforcing the "one source of truth" requirement.

---

## Design Requirements (UI/UX — 20 marks)

- Clear navigation between the 5 systems + chat (sidebar or top nav).
- Empty states, loading states, and error states for every list and every mutation — no blank screens or unhandled spinners.
- Make the chat feel like "asking a helpful senior who knows everything about campus" (the brief's own framing) — approachable, fast, not a bare textbox with raw JSON responses.
- Responsive enough to demo cleanly on a laptop screen at minimum.
- Consistent color system: use priority/status colors consistently across announcements, assignments, and events so judges can scan state at a glance.

---

## API Contract You'll Consume (confirm exact shape with Member 2)

```
GET    /api/schedules            GET    /api/rooms                GET    /api/events
POST   /api/schedules            POST   /api/rooms                POST   /api/events
PUT    /api/schedules/:id        PUT    /api/rooms/:id             PUT    /api/events/:id
DELETE /api/schedules/:id        DELETE /api/rooms/:id             DELETE /api/events/:id
                                  POST   /api/rooms/:id/book        POST   /api/events/:id/register
                                  DELETE /api/rooms/:id/bookings/:bookingId
                                                                     DELETE /api/events/:id/registrations/:studentId

GET    /api/announcements        GET    /api/assignments           POST   /api/agent/chat
POST   /api/announcements        POST   /api/assignments
PUT    /api/announcements/:id    PUT    /api/assignments/:id
DELETE /api/announcements/:id    DELETE /api/assignments/:id
```

## Deliverables Checklist

- [ ] 5 dashboard sections, each with working list/add/edit/delete
- [ ] Room booking + cancel-booking UI, with conflict errors surfaced
- [ ] Event registration + cancel-registration UI, with capacity enforcement surfaced
- [ ] All changes persist across reload (verified by you, not assumed)
- [ ] Chat widget wired to `/api/agent/chat`, renders clarifying questions and action confirmations
- [ ] Loading/empty/error states everywhere
- [ ] Cohesive visual design across all screens