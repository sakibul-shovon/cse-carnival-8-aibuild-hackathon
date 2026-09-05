# CampusOS — Project Details

## 1. Project Overview
CampusOS is an intelligent university operating system being built for the AI Build Hackathon. 
The problem it solves: Campus information (classes, room availability, announcements, deadlines) is often scattered across multiple group chats, noticeboards, and spreadsheets, making it difficult for students to find what they need when they need it. CampusOS centralizes this information.
The target users are university students.

The platform consists of two major components:
1. **Campus Data Manager:** A dashboard to view and manage (CRUD) campus data.
2. **AI Agent:** A conversational assistant that understands and acts on the live campus data.

## 2. Core Objective
CampusOS provides a single intelligent interface for:
- **Schedules:** Finding when and where classes are held.
- **Rooms:** Finding available rooms and booking them.
- **Events:** Discovering campus events and registering for them.
- **Announcements:** Staying up to date with university notices.
- **Assignments:** Tracking upcoming deadlines and grades.
- **Campus Actions:** Enabling users to seamlessly act on this data (booking, registering) through either the UI or the AI agent.

## 3. Technology Stack
*Note: The project is currently a foundational repository. The following stack is the **planned** architecture.*
- **Next.js App Router**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **Supabase PostgreSQL** (Persistent Database)
- **LLM Provider** — OpenAI or Groq via `LLM_PROVIDER`; both use the OpenAI-compatible chat-completions API through a single provider class (`src/lib/ai/provider/`). Groq verified live.
- **Native Function/Tool Calling** — implemented (`src/lib/ai/agent.ts`, zod-validated tool registry)
- Zod (Schema validation)
- React Server Actions / Next.js API Routes (Backend layer)

## 4. System Architecture

**Frontend Flow:**
```text
Frontend (Dashboard)
↓
Next.js API / Server Layer
↓
Service Layer
↓
Supabase PostgreSQL
```

**AI Agent Flow:**
```text
User
↓
AI Agent
↓
LLM
↓
Native Tool Calling
↓
Backend Service
↓
Supabase
↓
Tool Result
↓
LLM
↓
User
```
**Why the Service Layer exists:** The service layer ensures that business logic, validation, and database operations are not duplicated. Both the Frontend API routes and the AI Agent's tool calls use the exact same service layer to ensure data consistency and prevent bugs.

## 5. Database Architecture
*The following schema is planned based on the official JSON seed data.*

### schedules
- `id`: Unique identifier
- `course`: Course code
- `title`: Full course title
- `day`: Day of week
- `start_time`: 24h format (HH:MM)
- `end_time`: 24h format (HH:MM)
- `room`: Room number
- `instructor`: Instructor name
- `section`: Section label

### rooms
- `id`: Unique identifier
- `room_number`: Room code
- `type`: "classroom" | "lab" | "seminar"
- `capacity`: Max number of people
- `equipment`: List of available equipment
- `floor`: Floor number
- `status`: "available" | "unavailable"

### room_bookings
*Currently represented as an array inside rooms in the seed JSON, but planned as a relational table.*
- `booking_id`: Unique booking ID
- `booked_by`: Name of person/org who booked
- `date`: ISO date (YYYY-MM-DD)
- `start_time`: 24h (HH:MM)
- `end_time`: 24h (HH:MM)
- `purpose`: Reason for booking

### events
- `id`: Unique identifier
- `name`: Event name
- `description`: Full event description
- `date`: Start date (YYYY-MM-DD)
- `start_time`: 24h (HH:MM)
- `end_time`: 24h (HH:MM)
- `end_date`: End date
- `venue`: Room number
- `organizer`: Organizing person or club
- `capacity`: Max registrations allowed
- `registered`: Current registration count
- `status`: "upcoming" | "ongoing" | "completed" | "cancelled" | "full"

### event_registrations
*Currently represented as an array inside events in the seed JSON, but planned as a relational table.*
- `student_id`: Student ID
- `name`: Student name

### announcements
- `id`: Unique identifier
- `title`: Announcement headline
- `body`: Full text
- `date`: Date posted (YYYY-MM-DD)
- `priority`: "high" | "medium" | "low"
- `posted_by`: Author name
- `expires`: Expiry date (YYYY-MM-DD)

### assignments
- `id`: Unique identifier
- `course`: Course code
- `course_title`: Full course title
- `title`: Assignment title
- `description`: Full task description
- `assigned_date`: Date assigned (YYYY-MM-DD)
- `deadline`: Submission deadline (YYYY-MM-DD)
- `submission_platform`: Where to submit
- `status`: "pending" | "submitted" | "graded" | "late"
- `marks`: Total marks

## 6. Data Rules
- **Dates:** ISO 8601 (`YYYY-MM-DD`)
- **Time:** 24-hour format (`HH:MM`)
- **University Week:** Sunday–Thursday
- **Enums:** Use exact enum values defined in the official schema (e.g. `type`, `status`, `priority`).
- **Seed Data:** JSON files in `data/` are seed data **only**. They are not the runtime source of truth.

## 7. Backend Architecture
*Implemented (Tasks 1–4)*
- **API/Server Layer:** Next.js Route Handlers / Server Actions (frontend). Admin client (`src/lib/supabase/admin.ts`) for scripts.
- **Validation:** Zod schemas in `src/lib/validations/` enforce strict data types before any service call.
- **Services:** Reusable async TypeScript functions in `src/services/`. Consistent `{ data, error }` response format.
- **Database Access:** `src/lib/supabase/server.ts` (Next.js request context) and `src/lib/supabase/admin.ts` (scripts/background).
- **Error Handling:** Human-readable error messages in the unified response wrapper; no raw DB errors exposed.
- **Persistence:** All mutations write permanently to Supabase PostgreSQL.
- **Room Booking Architecture:**
  - Application-level overlap guard: `new_start < existing_end AND new_end > existing_start`.
  - Availability check: status=available + capacity threshold + equipment containment + no time overlap.
  - DB-level `EXCLUDE USING gist` constraint as final safety net.
- **Event Registration Architecture:**
  - Pre-insert checks: event existence, status (not cancelled/completed), capacity (`registered < capacity`), duplicate (`UNIQUE(event_id, student_id)`).
  - Post-insert atomic update: increments `registered` count; sets `status=full` when at capacity.
  - Cancellation rollback: decrements `registered`; reverts `status` from `full` to `upcoming`.

## 8. CRUD Requirements
Full CRUD must be supported in the Dashboard for:
- Schedules
- Rooms
- Events
- Announcements
- Assignments

Additionally, the backend must support these specific state-changing actions:
- Room booking
- Event registration
- Event registration cancellation

## 9. Room Booking Logic
A booking conflicts and must be rejected when an overlap occurs.
**Overlap Rule:**
`new_start < existing_end AND new_end > existing_start`

The backend must validate:
- Room existence
- Room availability/status
- Date and time formatting
- Overlap prevention

## 10. Event Registration Logic
The backend must validate:
- **Event lookup:** Ensure the event exists.
- **Full checks:** Ensure registration count is less than capacity.
- **Cancellation checks:** Ensure the event is not marked "cancelled".
- **Duplicate prevention:** Ensure the student is not already registered.
- **Persistence & Cancellation:** Registering and unregistering must permanently update the database.

## 11. AI Agent Architecture
**Implemented (Task 5):**
```text
POST /api/chat  (src/app/api/chat/route.ts — zod request validation, sanitized errors)
   ↓
runAgent()      (src/lib/ai/agent.ts — loop: LLM → tool calls → results → LLM, max 6 iterations)
   ├─ buildSystemPrompt()  (src/lib/ai/prompt.ts — rules + live clock + available/unavailable domains)
   ├─ getCampusNow()       (src/lib/ai/datetime.ts — CAMPUS_TIMEZONE, Sun–Thu week bounds)
   ├─ LLMProvider          (src/lib/ai/provider/ — OpenAI | Groq, selected by LLM_PROVIDER)
   └─ ToolRegistry         (src/lib/ai/tools/ — ToolDefinition { name, description, zod schema, execute(params, ctx) })
                              ↓ execute() calls src/services/* (never Supabase directly)
```
Shared client/server types: `src/types/ai.ts` (`ChatRequest`, `ChatResponse`, `ToolEvent`, `CampusNow`).

The AI will utilize native tool calling with the following 9 planned tools (none implemented yet — Tasks 6–7):
1. `get_schedule(day?)`
2. `get_next_class(current_day, current_time)`
3. `get_assignments(course?, status?, due_before?)`
4. `get_announcements(priority?, active_only?)`
5. `get_events(date?, upcoming_only?)`
6. `check_room_availability(date, start_time, end_time, min_capacity?, required_equipment?)`
7. `book_room(room_number, date, start_time, end_time, purpose, booked_by)`
8. `register_for_event(event_name_or_id, student_name, student_id)`
9. `cancel_registration(event_name_or_id, student_id)`

## 12. AI Safety and Reasoning
- **Live Data Requirement:** The AI must only answer based on current Supabase data.
- **Clarification:** The AI must ask follow-up questions if a request is vague (e.g., "Book a room tomorrow").
- **Refusal & Authorization:** The AI must politely refuse invalid actions (e.g., booking a room that is already taken).
- **No Hallucination:** Never guess campus data.
- **Action Confirmation:** Never report success until the backend API confirms the action was persisted.
- **Multi-Tool Reasoning:** The AI must be able to use multiple tools in sequence (e.g., checking schedule, then finding an available room).
- **Date/Time Reasoning:** The AI must resolve relative dates ("tomorrow") against the current date and university week rules.

## 13. Frontend Architecture
*Planned Routes:*
- `/dashboard` (Overview)
- `/schedule`
- `/rooms`
- `/events`
- `/announcements`
- `/assignments`
- `/ai` (AI Assistant Interface)

*Implementation Status:* **Not yet implemented.** Only UI/UX documentation exists.

## 14. UI/UX Architecture
The frontend strictly follows `docs/frontend-uiux.md`.
- **Design Tokens:** Semantic CSS variables for colors (Primary Blue, AI Accent Purple, Backgrounds).
- **Typography:** Sans-serif, optimized for dense information and AI chat legibility.
- **Spacing:** 4px/8px baseline grid.
- **Responsive Behavior:** Mobile-first, utilizing drawers or bottom navigation on small screens.
- **Accessibility:** Semantic HTML, keyboard navigation, visible focus states.
- **States:** Required use of loading skeletons, empty states, and error states for all data views.
- **Dialogs:** Destructive actions require explicit confirmation dialogs.
- **AI Interaction:** Clear tool-calling transparency (e.g., "Checking availability...") and structured data cards in chat.

## 15. Security
- **Environment Variables:** All secrets managed via `.env`. A `.env.example` must be maintained.
- **Server-Side Secrets:** API keys for LLMs and Supabase Service Role Keys must never be exposed to the browser.
- **Supabase Security:** Row Level Security (RLS) configured if querying directly from the client.
- **API Validation:** All incoming API requests must be sanitized and validated.
- **No Credentials:** Never commit secrets to source control.

## 16. Team Ownership
- **Teammate 1 (Shehab): Backend + Database**
  - Owns Supabase setup, schemas, service layer, CRUD operations, room booking logic, event logic, and backend testing.
- **Teammate 2: AI Agent**
  - Owns LLM integration, tool calling configuration, multi-tool reasoning, and ensuring AI safety rules are met.
- **Teammate 3: Frontend + UI/UX**
  - Owns Next.js UI, Tailwind, shadcn/ui components, responsive dashboard, AI UI, and all UI states.

## 17. Development Workflow
1. Pull the latest `main` branch.
2. Read `project-context.md`.
3. Work strictly by assigned task.
4. Test the implementation locally.
5. Update documentation to reflect changes.
6. Commit with a meaningful message.
7. Push to the repository.

## 18. Architecture Non-Negotiables
- Supabase is the **runtime source of truth**.
- The AI must use the **live backend**.
- The AI must use **native tool calling** (no prompt-chaining hacks).
- **No fake actions** or mocked successes.
- **No hallucinated data**.
- Preserve the official **CampusOS schema**.
- **No secrets** in source control.
- **Preserve teammate work**.

## 19. Current Implementation Status
*Accurate as of the latest repository inspection.*
- **Backend/Database:** Implemented (Tasks 1–4) — Supabase configured, schema/migrations, CRUD service layer, room booking (overlap detection) and event registration (capacity + duplicate prevention).
- **Frontend/UI:** Foundation COMPLETE (Task 9) + Dashboard (Task 10) — Next.js 16 app shell, 7 routes, shadcn/ui components, dashboard widgets. Data CRUD pages (Tasks 11–16) not started.
- **AI Agent:** Foundation COMPLETE (Task 5) + all 9 campus tools (read tools Task 6, action tools Task 7) + reasoning/safety (Task 8) — `/api/chat`, provider abstraction, native tool-calling loop, name→id resolution, deterministic date resolution, hardened safety prompt, tests. All AI tasks (5–8) complete.
- **Documentation:** `docs/frontend-uiux.md`, `project-context.md`, `AGENTS.md`, and `claude.md` have been established to govern future development. Seed data and schemas are present in `data/` and `schema/`.
