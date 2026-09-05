# CampusOS Project Context

This is a **LIVING DOCUMENT**. Every teammate must read it before starting a task and update it after completing a task. Never delete useful information written by another teammate. It must always represent the current state of the repository.

## 1. Project Overview
CampusOS is an intelligent university operating system powered by an AI agent that understands and acts on real-time campus data.

- **Frontend:** Next.js (Dashboard & AI Agent)
- **Backend Services:** Next.js Server Actions / API Layer
- **Database:** Supabase PostgreSQL (Single Source of Truth)
- **AI Agent:** LLM provider with native tool/function calling

## 2. Technology Stack
- **Frontend:** Next.js, App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js server/API architecture, TypeScript, Service layer
- **Database:** Supabase PostgreSQL
- **AI:** LLM provider with native tool/function calling — implemented behind a provider abstraction (`LLM_PROVIDER=openai|groq`, both via the OpenAI-compatible chat-completions API). Verified live with Groq `openai/gpt-oss-120b`; OpenAI `gpt-4o-mini` supported but unverified (account had no credits).
- **Data:** Repository JSON files are seed data ONLY.

## 3. Core Architecture
```text
Frontend (Dashboard & AI Agent)
   ↓
API / Server Actions
   ↓
Service Layer
   ↓
Supabase PostgreSQL (Single Source of Truth)
```

## 4. Team Ownership
- **Teammate 1 (Backend & Database):** Supabase, PostgreSQL schema, migrations, seed data, backend validation, CRUD, room booking, event registration, backend testing.
- **Teammate 2 (AI Agent):** LLM integration, agent architecture, native tool calling, backend integration, multi-tool reasoning, date/time reasoning.
- **Teammate 3 (Frontend & UI/UX):** Next.js, Tailwind, shadcn/ui, design system, dashboard, AI UI, loading/empty/error states. Must follow `docs/frontend-uiux.md`.

## 5. Current Implementation Summary

### Completed
- **Frontend Design System Guidelines:** Created `docs/frontend-uiux.md` outlining typography, colors, layout, and UI state conventions.
- **Project Structure Analysis:** Audited seed data and schemas.
- **Next.js & Supabase Foundation:** Initialized Next.js, Tailwind, TypeScript, Supabase client/server utilities, database schema, types, and seed scripts.
- **Backend CRUD Services:** Implemented unified validation (using Zod) and pure async service functions for all core entities (schedules, rooms, events, announcements, assignments).
- **Room Booking Service:** Full booking lifecycle with mandatory overlap detection, availability search (capacity + equipment filters), and DB-level `EXCLUDE` constraint safety net.
- **Event Registration Service:** Full registration lifecycle with capacity enforcement, duplicate prevention, and automatic `registered` count + `status` synchronization.
- **Task 9 — Frontend Foundation:** Initialized Next.js 16 (App Router, TypeScript, Tailwind CSS v4) at the repository root with shadcn/ui (radix-nova style). Implemented design tokens from `docs/frontend-uiux.md` in `src/app/globals.css` (brand, surface, status, AI, and domain colors with light/dark values), Inter typography, responsive app shell (`src/components/layout/`: sticky desktop sidebar ≥lg, mobile header + sheet drawer <lg), all 7 routes (`/dashboard`, `/schedule`, `/rooms`, `/events`, `/announcements`, `/assignments`, `/ai` — `/` redirects to `/dashboard`), shared `PageHeader`/`EmptyState`/`ErrorState` components, `error.tsx` + `not-found.tsx` boundaries, and shadcn/ui primitives (button, card, badge, input, select, dialog, table, skeleton, sheet, separator, label). Pages show honest empty states — no fake data, no backend logic, no AI logic.
- **Task 5 — AI Agent Foundation (T2):** Provider-agnostic agent core with native tool calling, `POST /api/chat`, server-injected campus clock, safety system prompt, tool registry, 13 passing unit tests (mock provider), and a live smoke test against Groq. Files: `src/lib/ai/{agent,prompt,datetime,errors}.ts`, `src/lib/ai/provider/{types,openai,index}.ts`, `src/lib/ai/tools/{registry,index,get-current-datetime}.ts`, `src/lib/ai/__tests__/*.test.ts`, `src/app/api/chat/route.ts`, `src/types/ai.ts`, `scripts/ai-smoke.ts`, `vitest.config.ts`. Deps added: `openai`, `zod@^4`; dev `vitest@^3`, `tsx`, `dotenv`. Scripts: `npm test`, `npm run ai:smoke`. None of the 9 campus tools yet (Tasks 6–7).
- **Task 6 — AI Read Tools (T2):** Implemented the six read tools — `get_schedule`, `get_next_class`, `get_assignments`, `get_announcements`, `get_events`, `check_room_availability` — each as a `ToolDefinition` in `src/lib/ai/tools/` that validates params with zod, calls the backend service layer, and maps `ServiceResponse` → `ToolResult` (`src/lib/ai/tools/service.ts` `fromService()`). Registered in `createDefaultRegistry()`. Files: `src/lib/ai/tools/{get-schedule,get-next-class,get-assignments,get-announcements,get-events,check-room-availability,service}.ts`, `src/lib/ai/__tests__/read-tools.test.ts` (14 tests). Verified: `tsc`, `next build`, `eslint`, 27/27 vitest, and a live agent smoke — correct tool selection + parameter/date extraction, backend errors relayed safely with no invention. Action tools (`book_room`, `register_for_event`, `cancel_registration`) remain for Task 7.
- **Task 7 — AI Action Tools (T2):** Implemented the three action tools — `book_room`, `register_for_event`, `cancel_registration` — in `src/lib/ai/tools/`, wired to the backend services (`createBooking`, `registerForEvent`, `cancelRegistration`); business logic (overlap/capacity/duplicate checks) stays in the service layer. `book_room` resolves `room_number`→`room_id` and generates a `booking_id`; register/cancel resolve `event_name_or_id`→`event_id` (`src/lib/ai/tools/resolve.ts`, with not-found/ambiguous handling). Files: `book-room.ts`, `register-for-event.ts`, `cancel-registration.ts`, `resolve.ts`, `action-tools.test.ts` (10 tests). **Fix:** made all optional tool params `.nullish()` — Groq's tool-call validator rejected `null` for omitted optionals; this also hardened the Task 6 read tools. Verified: `tsc`, `eslint`, `next build`, 37/37 vitest, live agent smoke (correct tool + param selection, "tomorrow" resolution, vague booking clarified, backend errors relayed without fabrication).
- **Task 8 — AI Reasoning & Safety (T2):** Added deterministic relative-date resolution — `resolveRelativeDates()` in `src/lib/ai/datetime.ts` injects exact today/tomorrow/yesterday and academic-week (Sun–Thu, rolls forward on Fri/Sat weekends) date maps into the system prompt, so the model uses exact dates instead of error-prone math. Strengthened the prompt: multi-tool examples (free-time = schedule+events; room search), explicit out-of-scope refusal, weekday→date mapping, and clearer clarification rules. Tightened `get_assignments` description to steer `due_before` for "due this week". Files: `src/lib/ai/datetime.ts`, `src/lib/ai/prompt.ts`, `src/lib/ai/tools/get-assignments.ts`, `src/lib/ai/__tests__/reasoning.test.ts` (4 tests, 41 total). Verified live: "next Wednesday" → exact date; "order pizza" refused; "due this week" → `due_before` = resolved week end; vague booking clarified.
- **Task 10 — Dashboard:** Built the CampusOS dashboard at `/dashboard`, **wired to live backend data**. Added domain types (`src/lib/types.ts`, mirrors `schema/schema.md`), date/time helpers (`src/lib/datetime.ts`, Sunday–Thursday week aware), dashboard selectors (`src/lib/dashboard-selectors.ts`: today's classes, next class, active announcements, upcoming events, upcoming deadlines, room-availability with the AGENTS.md overlap rule, summary stats), and the data service (`src/lib/data/dashboard.ts`) that fetches `GET /api/dashboard`. The aggregate route `src/app/api/dashboard/route.ts` pulls all five systems from the service layer (schedules, rooms, bookings, events, announcements, assignments) and groups bookings onto each room so availability is computed live. Widgets in `src/components/dashboard/`: stat cards, Today's Schedule (highlights next class), Assignment Deadlines (proximity badges), Announcements (priority-sorted), Upcoming Events, Rooms Available Now. Client component (`dashboard-content.tsx`) handles loading (skeletons), ready (populated), empty (backend unreachable → 404), and error (retryable) states. No runtime JSON/seed data or fake permanent data; Supabase is the single source of truth. Verified live data render across desktop/tablet/mobile (24 schedules, 20 rooms, 7 events, 8 announcements, 8 assignments).
- **Task 11 — Schedule UI:** Built full schedule management at `/schedule` wired to **live backend CRUD**. Added HTTP API routes (`src/app/api/schedules/route.ts` GET+POST, `src/app/api/schedules/[id]/route.ts` PATCH+DELETE) that call the existing Zod-validated service layer (`src/services/schedules.ts`) → Supabase. Client data layer `src/lib/data/schedules.ts`. Components in `src/components/schedule/`: `schedule-content.tsx` (list with desktop table / mobile card list, day + course/title filters, sorted by weekday then time, readable 12h times, loading skeleton / empty / no-match / error states), `schedule-form-dialog.tsx` (create + edit with client-side validation reusing the backend `ScheduleSchema` plus an end-time-after-start rule), `delete-schedule-dialog.tsx` (confirmation for destructive delete), `feedback-toaster.tsx` (scoped success/error toasts). Verified full CRUD end-to-end against live Supabase (create/edit/delete persist + live UI update, duplicate & invalid input rejected with 400) across desktop/tablet/mobile. No fake data.
- **Task 12 — Rooms UI:** Built full room management at `/rooms` wired to **live backend services**. Added HTTP API routes: `src/app/api/rooms/route.ts` (GET+POST), `src/app/api/rooms/[id]/route.ts` (PATCH+DELETE), `src/app/api/rooms/[id]/bookings/route.ts` (GET), `src/app/api/bookings/route.ts` (GET+POST), `src/app/api/bookings/[id]/route.ts` (DELETE) — all thin handlers over `src/services/rooms.ts` and `src/services/room_bookings.ts`. Client data layer `src/lib/data/rooms.ts`. Components in `src/components/rooms/`: `rooms-content.tsx` (responsive card grid, search + type + status filters, booking counts, loading/empty/no-match/error states), `room-form-dialog.tsx` (create+edit with Zod `RoomSchema` validation, equipment as comma list), `delete-room-dialog.tsx` (confirmation), `book-room-dialog.tsx` (booking interface — basic field validation only; conflicts/overlap enforced by backend and surfaced inline), `room-details-dialog.tsx` (room info + per-room booking list with cancel), `room-status-badge.tsx`. Shared `src/components/feedback-toaster.tsx` (success/failure toasts). **No booking business logic duplicated in the frontend** — `createBooking` calls the backend which owns conflict detection (application check + DB EXCLUDE constraint). Verified via live backend: overlapping booking rejected (400), adjacent booking allowed (201), full room CRUD, cancel; conflict message surfaces in the booking dialog. Tested desktop/tablet/mobile. No fake data.
- **Task 13 — Events UI:** Built full event management at `/events` wired to **live backend data**. Added HTTP API routes: `src/app/api/events/route.ts` (GET+POST), `src/app/api/events/[id]/route.ts` (PATCH+DELETE), `src/app/api/events/[id]/registrations/route.ts` (GET+POST register), `src/app/api/events/[id]/registrations/[studentId]/route.ts` (DELETE cancel) — thin handlers over `src/services/events.ts` and `src/services/event_registrations.ts`. Client data layer `src/lib/data/events.ts`. Components in `src/components/events/`: `events-content.tsx` (responsive card grid with status filter + search, capacity/registration-count progress bar, loading/empty/no-match/error states), `event-form-dialog.tsx` (create+edit with Zod `EventSchema`, description textarea, status select), `delete-event-dialog.tsx` (confirmation), `register-dialog.tsx` (registration interface), `event-details-dialog.tsx` (event info + registration information list with cancel), `event-status-badge.tsx` (upcoming/ongoing/completed/cancelled/full). **No registration logic duplicated** — backend enforces capacity/full, cancelled, completed and duplicate rules; Register button disabled for full/cancelled/completed as UX affordance only. Verified via live backend: duplicate rejected (400), capacity fill auto-sets status `full`, over-capacity rejected (400), cancel decrements + reverts `full`→`upcoming`; full event's Register disabled in UI; register/cancel surface toasts. Tested desktop/tablet/mobile. No fake data.
- **Task 14 — Announcements UI:** Built full announcements management at `/announcements` wired to **live backend CRUD**. Added HTTP API routes: `src/app/api/announcements/route.ts` (GET+POST), `src/app/api/announcements/[id]/route.ts` (PATCH+DELETE) — thin handlers over `src/services/announcements.ts`. Client data layer `src/lib/data/announcements.ts`. Components in `src/components/announcements/`: `announcements-content.tsx` (card list, search + priority + active/expired filters, sorted active-first then priority then date, loading/empty/no-match/error states), `announcement-form-dialog.tsx` (create+edit with Zod `AnnouncementSchema`, body textarea, priority select, expiry-after-date check), `delete-announcement-dialog.tsx` (confirmation). Reuses shared `PriorityBadge` (`src/components/status-badges.tsx`) and `FeedbackToaster`. Active/expired derived from `expires` vs today. Verified via live backend: full CRUD (create 201, invalid priority rejected 400, update 200, delete 200) + UI create/delete with success toasts and filters. Tested desktop/tablet/mobile. No fake data.
- **Task 15 — Assignments UI:** Built full assignments management at `/assignments` wired to **live backend CRUD**. Added HTTP API routes: `src/app/api/assignments/route.ts` (GET+POST), `src/app/api/assignments/[id]/route.ts` (PATCH+DELETE) — thin handlers over `src/services/assignments.ts`. Client data layer `src/lib/data/assignments.ts`. Components in `src/components/assignments/`: `assignments-content.tsx` (desktop table / mobile card list showing course, course title, deadline + proximity badge, submission platform, status, marks; course + status + search filters; sorted by deadline; loading/empty/no-match/error states), `assignment-form-dialog.tsx` (create+edit with Zod `AssignmentSchema`, description textarea, status select, marks number, deadline-after-assigned check), `delete-assignment-dialog.tsx` (confirmation). Reuses shared `AssignmentStatusBadge` + `DeadlineBadge` and `FeedbackToaster`. Verified via live backend: full CRUD (create 201, invalid status rejected 400, update 200, delete 200) + UI create/delete with success toasts. Tested desktop/tablet/mobile. No fake data.
- **Task 16 — AI Agent UI:** Built a premium AI interface at `/ai` (control-center feel, not a generic chat clone) wired to the **live `/api/chat` agent**. Client data layer `src/lib/data/chat.ts` (posts `{ messages, user? }`, surfaces sanitized errors). Action-label map `src/lib/ai-labels.ts` translates backend tool names to friendly Checking/Searching/Booking/Registering labels + icons. Components in `src/components/ai/`: `ai-chat.tsx` (chat history, auto-scroll, textarea composer with Enter-to-send, loading/error/retry, New chat, optional identity persisted to localStorage and sent as `user`), `chat-message.tsx` (user/assistant bubbles with inline **bold** + bullet rendering so no raw markdown leaks), `tool-trace.tsx` (renders real `toolEvents` as completed/failed action chips), `thinking-indicator.tsx` (animated working state with rotating hints), `suggested-prompts.tsx` (campus quick-starters), `identity-dialog.tsx`. Only real backend replies + real tool events are shown — no fabricated responses; technical detail is hidden (friendly labels, sanitized errors). Verified end-to-end against the live agent (real "next class" answer with a `get_next_class` completed action trace). Tested desktop/tablet/mobile.
- **Task 19 — Full End-to-End Integration:** Verified both live-data directions against the running app + Supabase. **Scenario A (Dashboard → Supabase → AI):** created a high-priority announcement via the dashboard UI (marker "ZQX789"); immediately asked the AI to list high-priority announcements — it called `get_announcements` and returned the just-created notice with the marker, proving live reads (no caching/stale data). **Scenario B (AI → Tool → Supabase → Dashboard):** asked the AI to "book room 7A02 tomorrow 3–5 PM" — the `book_room` tool ran `createBooking` and persisted a booking to Supabase (AI-format `bk-<uuid>` id); the Rooms dashboard then showed 7A02 with "1 booking". Also confirmed the overlap rule (a duplicate API booking for the same slot was rejected 400). All test data cleaned up afterward (baseline: 8 announcements, 0 bookings on 7A02). **Known limitation (not a code bug):** the LLM provider intermittently returned 502 during testing; because the agent is non-streaming, if a *later* provider turn fails after a tool already ran, the UI shows an error even though the action persisted. The frontend correctly displays the backend's response and sanitizes errors; surfacing partial tool success on provider failure would be a backend agent change (Task 8, T2) and is out of scope for Task 19. No integration code changes were required — the frontend↔backend↔Supabase↔AI wiring is consistent and working.
- **Authentication + session-locked identity:** Added email/password auth via **Supabase Auth** (student ID + full name stored in `user_metadata`; signup requires an `@aust.edu` email). Files: `src/lib/auth.ts` (`getSessionUser()` server reader), `src/lib/supabase/middleware.ts` (`updateSession` — refreshes the session cookie and gates all non-public routes; `/login`, `/signup`, `/auth`, and `/api` are exempt), `src/middleware.ts` (Next entry), `src/app/login/page.tsx` (login; `useSearchParams` wrapped in `<Suspense>`), `src/app/signup/page.tsx` (signup with `@aust.edu` + password-length validation), `src/components/layout/user-menu.tsx` (signed-in name/ID + sign out; `compact` for header). `AppShell` renders standalone (no chrome) on `/login` + `/signup`. **Identity is session-authoritative:** `/api/chat` overrides any client-supplied `user` with `getSessionUser()`; the event **register** dialog and room **book** dialog prefill and **lock** (readOnly) the student ID / name / booked_by from the signed-in user — users can't act as someone else. Verified: `tsc --noEmit` 0 errors, ESLint clean on all auth files, `vitest` 41/41 pass, `npm run build` compiles with `/login`, `/signup`, and Middleware in the route list. Supabase dashboard step: enable Email provider (turn off "Confirm email" for instant demo login).

### In Progress
- N/A

### Blocked
- N/A — Teammate 1's backend services (Tasks 1–4) are now on `main`, unblocking AI Tasks 6–7.

### Known Issues
- Groq model IDs rotate; `llama-3.3-70b-versatile` is gone from the free tier. Default is `openai/gpt-oss-120b`; override via `GROQ_MODEL`.
- The OpenAI provider path is code-complete but unverified live (test account returned `insufficient_quota`).

### Decisions
- Supabase PostgreSQL chosen as persistent database.
- JSON files are seed data only.
- AI uses native tool calling.
- Backend services are shared by dashboard and AI.
- Frontend follows `docs/frontend-uiux.md`.
- Next.js app lives at the repository root (single app for frontend, backend API/server actions, and AI agent).
- shadcn/ui initialized with the radix-nova style; components live in `src/components/ui/`.
- **AI (Task 5):** One `OpenAICompatibleProvider` class serves OpenAI and Groq (`baseURL` override); switch with `LLM_PROVIDER`. `/api/chat` is non-streaming JSON; `toolEvents` are returned post-hoc so the UI can render Checking/Booking/Completed/Failed states (streaming can be added in Task 16/18 without touching the tool layer). Student identity is now taken from the **signed-in Supabase Auth session** (`getSessionUser()`), which `/api/chat` treats as authoritative over any client-supplied `ChatRequest.user`; if absent the agent asks, never guesses. Tool calls execute sequentially. Campus clock uses `CAMPUS_TIMEZONE` (default `Asia/Dhaka`) and is injected into the system prompt on every request — never hardcoded. Tool failures return to the model as `{ ok: false, error }` (never thrown) so it explains them honestly. `vitest` is the shared test runner — add tests under `src/**/*.test.ts`, don't introduce another runner.
- **Auth:** Supabase Auth (email/password); identity in `user_metadata`; routes gated by middleware; booking/registration/AI use the session user, not typed input.

## 6. Task Status System
Statuses: NOT STARTED, IN PROGRESS, BLOCKED, READY FOR INTEGRATION, COMPLETED, NEEDS FIX.

| Task | Area | Owner | Status |
|------|------|-------|--------|
| Task 1: Project + Supabase Foundation | Backend | T1 | COMPLETED |
| Task 2: Backend CRUD | Backend | T1 | COMPLETED |
| Task 3: Room Booking | Backend | T1 | COMPLETED |
| Task 4: Event Registration | Backend | T1 | COMPLETED |
| Task 5: AI Agent Foundation | AI | T2 | COMPLETED |
| Task 6: AI Read Tools | AI | T2 | COMPLETED |
| Task 7: AI Action Tools | AI | T2 | COMPLETED |
| Task 8: AI Reasoning & Safety | AI | T2 | COMPLETED |
| Task 9: Frontend Foundation | Frontend| T3 | COMPLETED |
| Task 10: Dashboard | Frontend| T3 | COMPLETED |
| Task 11: Schedule UI | Frontend| T3 | COMPLETED |
| Task 12: Rooms UI | Frontend| T3 | COMPLETED |
| Task 13: Events UI | Frontend| T3 | COMPLETED |
| Task 14: Announcements UI | Frontend| T3 | COMPLETED |
| Task 15: Assignments UI | Frontend| T3 | COMPLETED |
| Task 16: AI Agent UI | Frontend| T3 | COMPLETED |
| Task 17: Frontend ↔ Backend Integration | Integration | ALL | COMPLETED |
| Task 18: AI ↔ Backend Integration | Integration | T1+T2 | COMPLETED |
| Task 19: Full End-to-End Integration | Integration | ALL | COMPLETED |
| Task 20: Backend Testing | Testing | T1 | NOT STARTED |
| Task 21: AI Testing | Testing | T2 | NOT STARTED |
| Task 22: Frontend Testing | Testing | T3 | NOT STARTED |
| Task 23: Judge Demo Testing | Testing | ALL | NOT STARTED |
| Task 24: Security Review | Hardening | ALL | NOT STARTED |
| Task 25: Data Consistency Review | Hardening | T1+T2 | NOT STARTED |
| Task 26: UI Polish | Hardening | T3 | NOT STARTED |
| Task 27: README | Finalization | ALL | NOT STARTED |
| Task 28: Deployment | Finalization | ALL | NOT STARTED |
| Task 29: Final Hackathon Review | Finalization | ALL | NOT STARTED |

## 7. Database Contract
*Implemented (Task 1)*
- **Tables:** `schedules`, `rooms`, `room_bookings`, `events`, `event_registrations`, `announcements`, `assignments`
- **Migration Location:** `supabase/migrations/0001_initial_schema.sql`
- **Seed Location:** `scripts/seed.ts` (Parses from `data/`)

## 8. API / Service Contract
*Service layer implemented (Task 2). HTTP/API routes and frontend wiring pending (Task 17).*
- **Service Layer (`src/services/`)**: `schedules.ts`, `rooms.ts`, `events.ts`, `announcements.ts`, `assignments.ts`.
- **Validation**: Strict Zod schemas in `src/lib/validations/`.
- **Response Format**: `Promise<{ data: T | null, error: string | null }>`
- **Room Booking Service (`src/services/room_bookings.ts`)**: `createBooking`, `cancelBooking`, `getBookings`, `getBookingsByRoom`, `checkRoomAvailability`, `getAvailableRooms`. Overlap rule enforced at application and DB constraint level.
- **Availability Logic**: Filters by `status=available`, optional `min_capacity`, optional `required_equipment[]`, and no overlapping booking for the requested time slot.
- **Event Registration Service (`src/services/event_registrations.ts`)**: `registerForEvent`, `cancelRegistration`, `getRegistrationsByEvent`, `getRegistrationStatus`. Capacity enforcement, duplicate prevention (by `student_id`), and `registered` count kept consistent on every mutation.
- **Validation scripts**: `npm run verify` — 26/26 tests passed against live Supabase.
- **Frontend expectation (Task 17):** the dashboard data layer (`src/lib/data/dashboard.ts`) fetches `GET /api/dashboard` returning `{ schedules, rooms, events, announcements, assignments }` (rooms include a grouped `bookings` array). This aggregate route is **implemented** (`src/app/api/dashboard/route.ts`) over the service layer; if the backend is unreachable a 404/500 surfaces as an empty/error state.
- **HTTP API routes (implemented):** `GET /api/dashboard` (aggregate over all services); `GET/POST /api/schedules` and `PATCH/DELETE /api/schedules/[id]` (Task 11); `GET/POST /api/rooms`, `PATCH/DELETE /api/rooms/[id]`, `GET /api/rooms/[id]/bookings`, `GET/POST /api/bookings`, `DELETE /api/bookings/[id]` (Task 12); `GET/POST /api/events`, `PATCH/DELETE /api/events/[id]`, `GET/POST /api/events/[id]/registrations`, `DELETE /api/events/[id]/registrations/[studentId]` (Task 13); `GET/POST /api/announcements`, `PATCH/DELETE /api/announcements/[id]` (Task 14); `GET/POST /api/assignments`, `PATCH/DELETE /api/assignments/[id]` (Task 15); plus `POST /api/chat` (AI agent, Task 5). Thin handlers over the service layer, returning `{ data }` or `{ error }` with appropriate status codes. Booking conflicts and registration rules are enforced by the backend services, not the frontend. All five entity CRUD route sets are now implemented.

## 9. AI Tool Contract

### Agent API (implemented — Task 5)
`POST /api/chat` (Node runtime, non-streaming). Types live in `src/types/ai.ts`.

```ts
// Request
{ messages: { role: "user" | "assistant"; content: string }[];   // 1–40 msgs, ≤4000 chars each, last must be "user"
  user?: { student_id: string; name: string } }                    // optional identity; agent asks if missing

// 200 Response
{ reply: string;
  toolEvents: { id; name; args; status: "completed" | "failed"; summary }[];
  now: { date; time; weekday; timezone; timestamp; weekStart; weekEnd } }

// 400 / 500 / 502 Response
{ error: { code: string; message: string } }   // sanitized; never leaks keys/stack traces
```

### Adding a tool (Tasks 6–7)
1. Create `src/lib/ai/tools/<tool-name>.ts` exporting a `ToolDefinition` (`name`, `description`, zod `schema`, `execute(params, ctx)`, optional `progressLabel`).
2. `execute` must call the backend service layer (`src/services/*`) and map its `ServiceResponse` to `toolOk(data)` / `toolError(code, message)`. Never query Supabase directly from a tool.
3. Register it in `createDefaultRegistry()` in `src/lib/ai/tools/index.ts`.
4. `ctx.now` gives the campus clock; `ctx.user` may be undefined.
5. Add a mock-provider test in `src/lib/ai/__tests__/`.

### Tools
All tool implementations live in `src/lib/ai/tools/`. Read tools call the backend service layer and map `ServiceResponse` → `ToolResult` via `fromService()` in `src/lib/ai/tools/service.ts`.

| Tool | Owner | Status | Backend service used |
|------|-------|--------|--------------------|
| get_current_datetime *(utility, not one of the 9)* | T2 | COMPLETED | none |
| get_schedule | T2 | COMPLETED | `getSchedules()` |
| get_next_class | T2 | COMPLETED | `getSchedules()` |
| get_assignments | T2 | COMPLETED | `getAssignments()` |
| get_announcements | T2 | COMPLETED | `getAnnouncements()` |
| get_events | T2 | COMPLETED | `getEvents()` |
| check_room_availability | T2 | COMPLETED | `getAvailableRooms()` |
| book_room | T2 | COMPLETED | `createBooking()` (resolves room_number→room_id) |
| register_for_event | T2 | COMPLETED | `registerForEvent()` (resolves event name/id) |
| cancel_registration | T2 | COMPLETED | `cancelRegistration()` (resolves event name/id) |

**Filtering semantics (Task 6):** `get_schedule(day?)` filters by exact weekday. `get_next_class(current_day, current_time)` scans the current day forward through the Sun–Thu week (wraps to next week; returns `{ next_class, is_today }`). `get_assignments(course?, status?, due_before?)` — course = case-insensitive substring on code/title, `due_before` inclusive. `get_announcements(priority?, active_only?)` — `active_only` compares `expires >= ctx.now.date`. `get_events(date?, upcoming_only?)` — `date` spans multi-day events; `upcoming_only` excludes completed/cancelled/ended. `check_room_availability` validates start<end then delegates all conflict/capacity/equipment logic to the backend.

## 10. Frontend Status
- **Framework:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4, shadcn/ui) initialized at repo root. `npm run dev` starts the app.
- **Routes (created, placeholder empty states pending data integration):** `/` (redirects to `/dashboard`), `/dashboard`, `/schedule`, `/rooms`, `/events`, `/announcements`, `/assignments`, `/ai`.
- **Shell:** `src/components/layout/` — `AppShell`, `AppSidebar` (desktop ≥lg), `AppHeader` + sheet drawer (mobile), `SidebarNav` with active-route highlighting.
- **Shared components:** `src/components/` — `PageHeader`, `EmptyState`, `ErrorState`; shadcn/ui primitives in `src/components/ui/` (button, card, badge, input, select, dialog, table, skeleton, sheet, separator, label).
- **Design tokens:** `src/app/globals.css` per `docs/frontend-uiux.md` (light + dark values; Tailwind utilities like `text-ai-accent`, `bg-danger/10`, `text-schedule` available).
- **Dashboard (Task 10):** `/dashboard` renders **live** widgets (stat cards, Today's Schedule, Assignment Deadlines, Announcements, Upcoming Events, Rooms Available Now) with loading/empty/error states, sourced from `GET /api/dashboard` (aggregate over the service layer). Data layer: `src/lib/types.ts`, `src/lib/datetime.ts`, `src/lib/dashboard-selectors.ts`, `src/lib/data/dashboard.ts`. Widgets in `src/components/dashboard/`. Shared `src/components/status-badges.tsx`.
- **Schedule UI (Task 11):** `/schedule` full CRUD wired to live Supabase via `/api/schedules` routes. Data layer `src/lib/data/schedules.ts`; components in `src/components/schedule/` (content/list+filters, form dialog with validation, delete confirmation, feedback toaster). Desktop table + mobile card list, day/course filters, readable 12h times, loading/empty/error/success states.
- **Rooms UI (Task 12):** `/rooms` full room CRUD + booking interface wired to live Supabase via `/api/rooms` and `/api/bookings` routes. Data layer `src/lib/data/rooms.ts`; components in `src/components/rooms/` (card grid + filters, room form, delete confirm, book dialog, details dialog with per-room bookings + cancel, status badge). Shared `src/components/feedback-toaster.tsx`. Booking conflict validation is backend-only.
- **Events UI (Task 13):** `/events` full event CRUD + registration interface wired to live Supabase via `/api/events` routes. Data layer `src/lib/data/events.ts`; components in `src/components/events/` (card grid + status filter, event form, delete confirm, register dialog, details dialog with registrations + cancel, status badge). Registration rules (full/cancelled/completed/duplicate) are backend-only; Register disabled in UI for full/cancelled/completed.
- **Announcements UI (Task 14):** `/announcements` full CRUD wired to live Supabase via `/api/announcements` routes. Data layer `src/lib/data/announcements.ts`; components in `src/components/announcements/` (card list + priority/state/search filters, form dialog with validation, delete confirm). Reuses shared `PriorityBadge` and `FeedbackToaster`. Active/expired derived from `expires` date.
- **Assignments UI (Task 15):** `/assignments` full CRUD wired to live Supabase via `/api/assignments` routes. Data layer `src/lib/data/assignments.ts`; components in `src/components/assignments/` (desktop table / mobile cards + course/status/search filters, form dialog with validation, delete confirm). Reuses shared `AssignmentStatusBadge` + `DeadlineBadge`.
- **AI Agent UI (Task 16):** `/ai` premium assistant wired to the live `/api/chat` agent. Data layer `src/lib/data/chat.ts`; action labels `src/lib/ai-labels.ts`; components in `src/components/ai/` (ai-chat, chat-message, tool-trace, thinking-indicator, suggested-prompts, identity-dialog). Shows chat history, loading, error+retry, and real tool/action traces (completed/failed); optional identity persisted to localStorage. No fabricated responses.
- **Frontend + integration complete:** Tasks 9–17 done. All dashboard/CRUD pages + AI chat are wired to live Supabase-backed APIs (`/api/dashboard` aggregate + per-entity routes). Note: Tasks 14/15/17 were implemented in parallel on `tanjim-tasks`; the merge kept this branch's tested implementations.

## 10a. Environment Variables (AI)
See `.env.example`. All server-only.
- `LLM_PROVIDER` — `openai` (default) or `groq`
- `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-4o-mini`)
- `GROQ_API_KEY`, `GROQ_MODEL` (default `openai/gpt-oss-120b`)
- `CAMPUS_TIMEZONE` — IANA zone used to resolve today/tomorrow (default `Asia/Dhaka`)

## 10b. Current Next Step
- **T2:** All AI tasks (5–8) complete, and Task 18 (AI↔Backend integration) verified end-to-end against live Supabase. Remaining AI work is Task 21 (AI testing).
- **Env:** Full live-data verification of AI tools requires Supabase env vars in `.env` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) + `npm run seed`. Without them, tools return a config error which the agent relays safely.
- **T3:** Task 12+; build Task 16 against the `/api/chat` contract in §9.

## 11. Git / Collaboration Rules
- `git pull origin main` before starting work.
- Never blindly overwrite teammate work.
- Run tests and verify changes before pushing.
- Commit messages should clearly describe the work (e.g., `feat(db): add Supabase schema`).
- Update `project-context.md` after pushing.
