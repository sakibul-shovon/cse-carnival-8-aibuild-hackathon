# CampusOS — Agent Development Instructions

## 1. Project Identity
CampusOS is an intelligent university platform being built for the AI Build Hackathon. It consists of two major parts: a Campus Data Manager (dashboard) and an AI Agent. The fundamental requirement of this project is that both the dashboard and the AI Agent must operate on **real-time/live campus data**. The AI must understand and act on the live backend state, not a separate or mock database.

## 2. Source of Truth Hierarchy

When resolving conflicts in requirements or instructions, follow this authority hierarchy:

1. Official problem statement / challenge requirements (`PROBLEM_STATEMENT.md`)
2. Official schema (`schema/schema.md`)
3. `project-context.md`
4. `projectdetails.md`
5. `FEATURES.md`
6. `PROGRESS.md`
7. `docs/frontend-uiux.md`
8. `AGENTS.md` / `agent.md` / `claude.md`
9. Source code and actual configuration
10. `README.md`

However, documentation must never falsely describe the implementation.

When determining whether something is actually implemented, tested, or working, always verify the source code and repository state directly.

That avoids a situation where `PROGRESS.md` says something is complete but the code says otherwise.

## 3. Technology Stack
The agreed upon technology stack is:
- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Appropriate server-side API/service architecture (Next.js API/Server Actions)
- **Database:** Supabase PostgreSQL
- **AI:** LLM with native tool/function calling

*Note: Do not claim a specific LLM provider is implemented unless the repository configuration explicitly confirms it.*

## 4. Architecture Rules
The intended architecture must follow this flow:

**Frontend / Dashboard Flow:**
Frontend → Next.js server/API layer → service layer → Supabase PostgreSQL

**AI Agent Flow:**
User → LLM → native function/tool calling → service layer → Supabase → tool result → LLM → user

**Crucial Note:** The JSON files provided in the repository (`data/`) are seed/reference data **only**. They must not become the runtime source of truth.

## 5. Database Rules
- **Supabase PostgreSQL is the persistent source of truth.**
- Do not replace the database with JSON, localStorage, or in-memory state.
- Preserve the official CampusOS schema.
- Database changes must be deliberate. Never casually delete or reset existing data.
- Use database migrations when appropriate.
- Keep backend TypeScript types and validation synchronized with the official schema.

**Required Tables:**
- `schedules`
- `rooms`
- `room_bookings`
- `events`
- `event_registrations`
- `announcements`
- `assignments`

## 6. AI Agent Rules
The AI Agent must adhere to the following safety and behavior rules:
- **Use native tool/function calling** for all data retrieval and actions.
- **Query live backend data**—never hallucinate campus information.
- **Never claim an action succeeded without backend confirmation.** (e.g., Do not say "Room booked" unless the API returns a success response).
- **Ask for missing critical information** if a user request is incomplete.
- **Refuse invalid or unauthorized actions** politely.
- **Handle vague requests safely** by seeking clarification.
- **Use multiple tools when necessary** to piece together information (e.g., checking the schedule and then checking room availability).
- **Respect current date/time** and university week rules when resolving relative dates like "tomorrow".
- **The AI Agent must not bypass the backend/service layer to access the database directly from the LLM integration.** The architecture stays: AI Agent → Native Tool → Service Layer → Supabase, rather than letting AI code randomly query Supabase everywhere.

## 7. Tool Contract
The following nine AI tools are planned. Their names and parameters must remain consistent across the AI agent configuration, backend implementation, frontend usage, and documentation:

1. `get_schedule(day?)`
2. `get_next_class(current_day, current_time)`
3. `get_assignments(course?, status?, due_before?)`
4. `get_announcements(priority?, active_only?)`
5. `get_events(date?, upcoming_only?)`
6. `check_room_availability(date, start_time, end_time, min_capacity?, required_equipment?)`
7. `book_room(room_number, date, start_time, end_time, purpose, booked_by)`
8. `register_for_event(event_name_or_id, student_name, student_id)`
9. `cancel_registration(event_name_or_id, student_id)`

## 8. Room Booking Rules
When processing a room booking, the backend must enforce the **overlap rule**. A booking conflicts when:
`new_start < existing_end AND new_end > existing_start`

Implementation requirements:
- Reject overlapping bookings.
- Validate the room exists.
- Validate room availability/status.
- Validate the date and time format.
- Confirm successful persistence to the database.
- Do not fake booking success in the UI or AI response.

## 9. Event Registration Rules
When registering a student for an event:
- The event must exist.
- The event must not be cancelled.
- The event must not be full (respect capacity).
- Duplicate registrations must be rejected.
- Registration must be persisted to the database.
- Cancellations must be persisted to the database.
- The AI must report the actual backend result of the attempt.

## 10. Frontend Rules
All UI implementations must follow the design guidelines located in `docs/frontend-uiux.md`.
Requirements:
- Responsive, mobile-friendly design.
- Accessible markup and keyboard navigation.
- Consistent use of the defined CSS design tokens.
- Integration of `shadcn/ui` where appropriate.
- Proper handling of loading states, empty states, and error states.
- Mandatory confirmation dialogs for destructive actions.
- A polished, premium dashboard experience.

## 11. Live Data Rule
**This is a critical hackathon requirement.**
The AI must always query the live backend for campus information.
- **Never** answer from hardcoded values.
- **Never** answer from stale JSON files.
- **Never** cache campus data in a way that bypasses the current backend state.
- **Never** assume data has not changed.

Judges will edit data through the dashboard and immediately ask the AI about it. The AI must reflect the latest state instantly.

## 12. Git Rules
When contributing to this repository:
- Pull the latest `main` before starting work.
- Inspect `git status` and `git log` carefully.
- Never blindly overwrite teammate work.
- Work only on your assigned task.
- Test thoroughly before committing.
- Commit meaningful, atomic changes.
- Push completed work to the remote repository.
- Do not commit secrets. Keep `.env` files private.
- Update `project-context.md` after meaningful task completion.
- Before modifying a file, inspect its current state and determine whether another teammate is actively working in that area.
- Do not rewrite, revert, or replace working code simply to match an older document.
- If documentation conflicts with implemented code, inspect the code and update the documentation instead of destroying working implementation.

## 13. Environment/Security Rules
Never commit sensitive credentials to the repository, including:
- Supabase service/secret keys
- LLM API keys
- Passwords or access tokens
- Private credentials

Use environment variables and maintain an `.env.example` file.
If Supabase is accessed directly from the browser, ensure appropriate Row Level Security (RLS) rules are configured. Server-only secrets must remain strictly server-side.

## 14. Documentation Rules
Whenever the implementation changes, you must:
- Update relevant documentation.
- Keep `PROGRESS.md` accurate (if it exists).
- Keep `FEATURES.md` accurate (if it exists).
- Keep `project-context.md` synchronized.
- **Do not claim unfinished features are complete.**

## 15. Implementation Workflow
Before writing code, agents must:
1. Pull the latest `main` branch.
2. Read `project-context.md`.
3. Read relevant documentation (`AGENTS.md`, `PROBLEM_STATEMENT.md`, etc.).
4. Inspect the existing implementation.
5. Identify dependencies.
6. Implement only the assigned task.
7. Test the changes.
8. Update documentation to reflect the new state.
9. Commit.
10. Push.

## 16. Anti-Hallucination Rules
Never assume:
- A file exists.
- An API endpoint exists.
- A database table exists.
- A feature is complete.
- A tool is implemented.
- A deployment URL exists.

**Verify the repository first before acting or updating documentation.**

## 17. Final Response Requirements
After completing a task, you must report to the user:
- What was changed.
- Which files were changed.
- The tests/checks performed to verify the changes.
- Any known limitations.
- Whether the documentation was updated.

Provide concise updates. Do not provide unnecessary commentary.

## 18. Team Ownership

The project has three primary ownership areas:

- Teammate 1 — Backend + Database
- Teammate 2 — AI Agent
- Teammate 3 — Frontend + UI/UX

Agents must respect ownership boundaries.

A teammate may inspect another area for integration or debugging, but should not make unrelated architectural changes there without coordination.

The detailed task assignments and dependencies are maintained in `project-context.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
