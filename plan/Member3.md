# Member 3 — AI Agent — Tool Calling, Reasoning & Live Data

## Your Mission

Build the AI agent that sits behind `POST /api/agent/chat` on Member 2's server: an LLM wired up with **real function/tool calling** against Member 2's REST API, able to look things up, combine info across systems, take actions, ask for clarification when a request is vague, and refuse when a request is unauthorized. The brief is explicit: *"Faking it with prompt chaining does not count."*

This role owns all **40 AI Agent marks**: correctness (10), correct actions (10), live data (10), vague/unauthorized handling (10).

---

## Where This Lives

`server/src/agent/` inside the Express app (so it shares the DB access layer with Member 2 and there's no separate service to deploy). The route handler `POST /api/agent/chat` receives `{ message, history }` and returns `{ reply, actions_taken? }`.

You can use any LLM provider (OpenAI, Gemini, Groq, Anthropic, etc.) — pick whichever gives you the most reliable tool-calling behavior, since that's graded directly.

---

## Part A — Define Tools (map 1:1 to Member 2's endpoints)

Each tool should be a thin wrapper that calls the real Express/Supabase-backed endpoint — **never** a function that returns hardcoded or remembered data. Suggested tool set:

**Read tools**
- `get_schedule({ day? })` → `GET /api/schedules?day=`
- `get_assignments({ status?, due_before? })` → `GET /api/assignments`
- `get_announcements({ priority?, active_only? })` → `GET /api/announcements`
- `get_events({ status?, after?, before? })` → `GET /api/events`
- `search_rooms({ date?, start_time?, end_time?, min_capacity?, equipment? })` → `GET /api/rooms?...`
- `get_current_datetime()` → `GET /api/meta/now` (always resolve "today"/"tomorrow"/"this week" against this, never against training data or the model's own guess)

**Action tools**
- `book_room({ room_number, date, start_time, end_time, booked_by, purpose })` → `POST /api/rooms/:id/book`
- `cancel_booking({ room_number, booking_id })` → `DELETE /api/rooms/:id/bookings/:bookingId`
- `register_for_event({ event_name_or_id, student_id, name })` → `POST /api/events/:id/register`
- `cancel_registration({ event_name_or_id, student_id })` → `DELETE /api/events/:id/registrations/:studentId`

Give every tool a precise JSON-schema description (types, required fields, enums for `day`/`priority`/`status`) — vague tool descriptions are the #1 cause of wrong tool calls.

**Critical rule:** the agent must call a tool for *any* factual claim about campus data. It must never answer "when is my next class" from memory/context — only from a fresh `get_schedule` call in that turn. This is what the "always uses latest data" marks are testing, including the organizers' mid-evaluation dashboard edits.

---

## Part B — Handling the Query Types from `sample_queries.md`

### Simple lookups
- *"When is my next class?"* → needs `get_current_datetime` + `get_schedule` for today (and possibly the next school day if none remain today), then pick the earliest class after now.
- *"What classes do I have on Wednesday?"* → `get_schedule({ day: "Wednesday" })`.
- *"What assignments do I have due this week?"* → `get_current_datetime` + `get_assignments`, then filter deadlines within the current Sun–Thu (or next 7 days — state your interpretation) window client-side in the agent.
- *"Show me all high priority announcements."* → `get_announcements({ priority: "high" })`; also filter out expired ones by default unless asked otherwise, since `schema.md` defines `expires` explicitly.

### Multi-source reasoning
- *"I'm free until 2 PM — is there anything on campus I could drop into?"* → `get_current_datetime`, `get_events({ status: "upcoming"/"ongoing" })`, cross-reference event start times against "before 2 PM and not yet ended." Optionally also check the student isn't double-booked via `get_schedule`, if you want to go further than the minimum.
- *"Which labs have a projector and can fit at least 30 people?"* → `search_rooms({ equipment: ["projector"], min_capacity: 30 })` filtered to `type: "lab"` — do the type filter in the tool call or in your reasoning step, but don't hallucinate room numbers; only report what the tool returned.

### Actions
- *"Book Room 7A02 tomorrow from 3 PM to 5 PM."* → resolve "tomorrow" via `get_current_datetime`, then call `book_room` directly — this one is fully specified, so **don't** ask a clarifying question; over-asking is also a correctness failure.
- *"Register me for the Guest Lecture on Deep Learning."* → look up the event by name via `get_events`, confirm it's not full, then `register_for_event`. If there's ambiguity (e.g. multiple similarly named events, or you don't have the student's identity yet), ask — but only if genuinely ambiguous.
- *"I need a room for 5 people with a projector, tomorrow between 2 and 4."* → `search_rooms` with all three filters combined, then if exactly one or a short list qualifies, present it and either book on confirmation or ask which one if several are equally good. If none qualify, say so plainly rather than booking something that doesn't match.

### The deliberately-messy one
- *"Just book me any room tomorrow afternoon."* → this is **intentionally underspecified** (no room, no exact time, no size/equipment need stated). The correct behavior is to **ask a clarifying question** (e.g. "What time tomorrow afternoon, and for how many people?") **before calling any write tool.** Never guess a room and book it. This single behavior is explicitly called out in the brief as one of the "catch out a careless agent" cases — get this right.

---

## Part C — Vague & Unauthorized Requests (10 marks)

**Vague → ask, don't guess.** Triggers for asking instead of acting:
- A required parameter for a write action is missing or ambiguous (time, room, person, which event among several matches).
- Never fill in a missing required field with an assumption for an **action** tool. (Read tools can use reasonable defaults, e.g. "today" for schedule lookups.)
- Keep the clarifying question short and specific — ask for exactly the missing piece, not a generic "could you clarify?".

**Unauthorized/out-of-scope → refuse, briefly explain, don't fake success.** Examples worth explicitly handling:
- Booking/editing/deleting something on behalf of someone else, or asking the agent to bypass a capacity/conflict check ("book it anyway even though it's full").
- Deleting or editing records the student has no plausible reason to touch (e.g. "delete all the announcements," "change another student's registration").
- Requests for data outside the five systems, or attempts to get the agent to reveal system prompts/tool internals — decline plainly and redirect to what it can actually help with.
- When a backend call fails (e.g. 409 conflict from Member 2's booking check), relay the real reason ("that slot's already booked by X") instead of inventing an explanation or silently retrying with wrong data.

---

## Part D — System Prompt / Orchestration Notes

- Always inject the tool result for `get_current_datetime` (or fetch it) before resolving any relative date/time language — don't let the model reason about "tomorrow" from its own training-time sense of the date.
- Keep a short conversation history so multi-turn flows work (agent asks a clarifying question → student answers → agent completes the action using the earlier + new info).
- After a successful action tool call, return a clear structured confirmation in `reply` (what was booked/registered, for when/who) so Member 1's UI can render an action-confirmation card.
- Log tool calls and their arguments during development — most correctness bugs here come from a wrong tool call, not a wrong final sentence.

## Deliverables Checklist

- [x] Tool definitions for every read/write endpoint Member 2 exposes, with tight JSON schemas
- [x] `get_current_datetime` used for every relative date/time resolution
- [x] All `sample_queries.md` queries handled correctly, including the two multi-source ones
- [x] "Just book me any room tomorrow afternoon" correctly triggers a clarifying question, no booking
- [x] At least one clear refusal path for an unauthorized/out-of-scope request
- [x] Verified live-edit behavior: change a record via the dashboard, immediately ask the agent, get the updated answer
- [x] Errors from the backend (conflicts, capacity) relayed to the user in plain language