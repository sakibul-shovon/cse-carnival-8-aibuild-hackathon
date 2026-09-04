# CampusOS — AI Build Hackathon Submission

An intelligent university platform: a **Campus Data Manager** dashboard plus an **AI Agent** that reads and acts on live campus data (schedules, rooms, events, announcements, assignments).

Built for the CampusOS AI Build Hackathon brief. See `PROBLEM_STATEMENT.md`, `schema.md`, and `sample_queries.md` (provided by the organizers) for the full spec this project is judged against.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Express.js (Node.js) |
| Database | Supabase (Postgres) |
| AI Agent | LLM with real tool/function calling, hitting the same Express API as the frontend |

**Golden rule of this project:** there is exactly **one** source of truth — the Supabase database, accessed only through the Express API. The React dashboard and the AI agent are both just clients of that API. Neither ever reads from the seed JSON files after initial load, and neither caches data beyond a single request. This is how we satisfy the hackathon's core requirement: *"a change made in the dashboard becomes the new truth for the whole app,"* and the agent must *"always query the current backend state."*

---

## Repository Structure

```
campusos/
│
├── README.md                    ← you are here
├── PROBLEM_STATEMENT.md         ← organizer-provided brief
├── schema.md                    ← organizer-provided field reference
├── sample_queries.md            ← organizer-provided judging queries
├── plan/
│   ├── PLAN.md                  ← Unified team implementation plan
│   ├── Member1.md               ← Member 1: React dashboard + chat UI
│   ├── Member2.md               ← Member 2: Express API + Supabase
│   └── Member3.md               ← Member 3: AI agent + tool calling
│
├── data/                        ← seed data (loaded into Supabase once, on setup)
│   ├── schedules.json
│   ├── rooms.json
│   ├── events.json
│   ├── announcements.json
│   └── assignments.json
│
├── server/                      ← Express backend (Member 2)
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── db/                  ← Supabase client + seed script
│   │   └── agent/                ← tool definitions + agent orchestration (Member 3)
│   ├── .env.example
│   └── package.json
│
└── client/                      ← React frontend (Member 1)
    ├── src/
    │   ├── pages/                ← 5 dashboard sections
    │   ├── components/
    │   ├── chat/                 ← agent chat widget
    │   └── api/                  ← API client
    └── package.json
```

---

## How the Three Roles Fit Together

```
[ React Dashboard ]        [ AI Agent (chat) ]
        │                          │
        └───────────┬──────────────┘
                     ▼
        [ Express REST API  (single source of truth) ]
                     │
                     ▼
        [ Supabase / Postgres ]
```

- **Member 1 (Frontend)** builds the dashboard that manages all 5 systems, and the chat widget the student talks to.
- **Member 2 (Backend)** builds the Express API and Supabase schema that both the dashboard and the agent depend on — including the booking/registration business logic (conflict checks, capacity checks).
- **Member 3 (AI Agent)** builds the tool-calling layer that lets the LLM call Member 2's API to answer questions and take actions, with correct behavior on vague or unauthorized requests.

Work can start in parallel once the API contract (routes + request/response shapes) in `plan/Member2.md` is agreed on — Member 1 and Member 3 can build against a mocked version of that contract before the real backend is ready.

---

## Setup (local)

```bash
# 1. Clone your fork
git clone https://github.com/YOUR_USERNAME/campusos-hackathon.git
cd campusos-hackathon

# 2. Backend
cd server
cp .env.example .env     # fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, LLM_API_KEY
npm install
npm run seed              # loads data/*.json into Supabase, once
npm run dev                # starts Express on http://localhost:4000

# 3. Frontend (new terminal)
cd client
npm install
npm run dev                # starts React on http://localhost:5173
```

The dashboard and the chat agent will both be available from the frontend at `http://localhost:5173`.

---

## Milestones

A suggested build order — each milestone should end with something demoable, not just code committed.

| # | Milestone | Owner(s) | Exit Criteria |
|---|---|---|---|
| M1 | API contract agreed + repo scaffolded | All | Routes/request-response shapes in `plan/Member2.md` finalized; `client/` and `server/` skeletons pushed |
| M2 | Supabase schema live + seed script working | Member 2 | All 5 tables created; `npm run seed` loads `data/*.json` into Supabase idempotently |
| M3 | Core CRUD API complete | Member 2 | GET/POST/PUT/DELETE working for all 5 resources, verified with Postman/curl |
| M4 | Dashboard — read + list views | Member 1 | All 5 sections render live data from the API, no manual refresh needed |
| M5 | Dashboard — add/edit/delete wired up | Member 1 | Full CRUD from the UI; changes persist across reload |
| M6 | Room booking + event registration logic | Member 2 | Conflict detection, capacity enforcement, and the two extra endpoints working end-to-end |
| M7 | Booking/registration UI | Member 1 | Book/cancel and register/cancel flows in the dashboard, backend errors surfaced clearly |
| M8 | Agent — read-only tool calling | Member 3 | Simple-lookup and multi-source queries from `sample_queries.md` answered correctly using live tool calls |
| M9 | Agent — action tool calling | Member 3 | Booking/registration queries from `sample_queries.md` executed correctly via tools |
| M10 | Agent — vague & unauthorized handling | Member 3 | "Just book me any room tomorrow afternoon" asks for clarification; at least one refusal path verified |
| M11 | Chat UI integration | Member 1 + Member 3 | Chat widget wired to `/api/agent/chat`, renders clarifying questions and action confirmations |
| M12 | Live-data end-to-end test | All | Edit a record in the dashboard, immediately ask the agent, confirm it reflects the change |
| M13 | Polish + design pass | Member 1 | Loading/empty/error states everywhere, consistent visual system across all screens |
| M14 | Deployment (bonus) + final README | All | App runs from a fresh clone per the Setup steps; live deployment link added if applicable |
| M15 | Submission | All | Fork public, `SUBMISSION.md` instructions followed, submitted before deadline |

> Treat M1–M3 as a hard prerequisite for M4 onward — Member 1 and Member 3 can build against a **mocked** version of the API contract in the meantime so no one is blocked waiting on the real backend.

---

## Scoring Checklist (from `PROBLEM_STATEMENT.md`)

| Criteria | Marks | Owner |
|---|---|---|
| Data Management | 20 | Member 2 (data), Member 1 (display) |
| CRUD Operations (add/edit/delete, persisted) | 20 | Member 1 + Member 2 |
| AI Agent — correct answers | 10 | Member 3 |
| AI Agent — correct actions | 10 | Member 3 |
| AI Agent — always uses latest data | 10 | Member 2 + Member 3 |
| AI Agent — handles vague/unauthorized requests | 10 | Member 3 |
| UI / UX and Design | 20 | Member 1 |
| **Total** | **100** | |

Bonus: live deployment, clean/organized code — shared responsibility across all three.