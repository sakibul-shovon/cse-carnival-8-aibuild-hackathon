# CampusOS

CampusOS is a complete campus data manager and AI assistant built for the AUSTPIC AI Build Hackathon. It keeps schedules, rooms, events, announcements, and assignments in one persistent SQLite database. The dashboard and the Gemini tool-calling agent use that same live state, so a saved dashboard edit is available to the assistant on its next question.

## Features

- Full create, read, edit, and delete support for all five campus systems
- Persistent SQLite storage seeded from the provided JSON without overwriting changes
- Room booking, booking lists, cancellation, operational-status checks, and exact overlap detection
- Event registration and cancellation with duplicate, capacity, and status protection
- Practical schema validation with clear 400, 404, and 409 responses
- Responsive dashboard with overview metrics, search, loading/empty/error states, confirmations, and feedback
- Browser-readable JSON database export and a terminal database inspector
- Real Gemini function calling through 21 read, search, reasoning, and action tools
- Configurable demo student identity and graceful operation when AI is not configured

## Architecture

```text
Browser dashboard ── REST API ──┐
                               ├── SQLite (live source of truth)
Gemini model ── tool calls ─────┘
```

The JSON files under `data/` are seed inputs only. `lib/store.js` owns validation and every database mutation. `lib/agent.js` exposes structured tools that query or mutate the store at call time; records are never copied into the AI prompt as a static snapshot.

## Tech stack

- Node.js and Express 5
- SQLite with `better-sqlite3`
- Google Gen AI SDK with native Gemini function calling
- Vanilla HTML, CSS, and JavaScript (no frontend build step)

## Prerequisites

- Node.js 20 or newer
- npm
- A Gemini API key to enable the AI assistant (all dashboard and REST functionality works without one)

## Setup

```bash
npm install
```

Copy `.env.example` to `.env`, then add your API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Seed the database. Initial data is loaded once; later seed runs preserve edited and deleted records:

```bash
npm run seed
```

SQLite databases are binary, so a normal text editor cannot display `campus.db`. Inspect all five systems in the terminal with:

```bash
npm run db:inspect
```

You can also select **View database JSON** on the overview screen or open `/api/database/export`. CampusOS uses rollback journaling so the persistent application data remains in the single `campus.db` file; the JSON files under `data/` are initial seed inputs only.

Start in development mode:

```bash
npm run dev
```

Or start normally:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | AI only | none | Enables the Gemini tool-calling assistant |
| `GEMINI_MODEL` | No | `gemini-3.6-flash` | Gemini model with function-calling support |
| `PORT` | No | `3000` | HTTP server port |
| `DATABASE_PATH` | No | `campus.db` | SQLite file path |
| `CAMPUS_TIMEZONE` | No | `Asia/Dhaka` | Timezone supplied to the agent |
| `DEMO_STUDENT_ID` | No | `20-40532` | Identity for event actions |
| `DEMO_STUDENT_NAME` | No | `Dr. Doom` | Display name and booking identity |
| `CORS_ORIGIN` | No | same-origin only | Comma-separated origins for a separately hosted frontend |

Never commit `.env`. It and all `*.db` files are ignored by Git.

## Using CampusOS

Use the sidebar to open any data system. Search the current records, add a record, or edit/delete an existing one. Rooms have a **Bookings** action for booking and cancellation. Events have an **Attendees** action for registration and cancellation. Every successful change is persisted before the interface refreshes.

Open **AI Assistant** to ask questions or request actions. Useful judge queries include:

- “When is my next class?”
- “What classes do I have on Wednesday?”
- “What assignments do I have due this week?”
- “Show me all high priority announcements.”
- “I’m free until 2 PM — is there anything on campus I could drop into?”
- “Which labs have a projector and can fit at least 30 people?”
- “Book Room 7A02 tomorrow from 3 PM to 5 PM for a project meeting.”
- “Register me for the Guest Lecture on Deep Learning.”

For an underspecified action such as “Just book any room tomorrow afternoon,” the agent asks for exact missing details instead of guessing.

## API overview

Health and summary endpoints:

- `GET /api/health`
- `GET /api/config`
- `GET /api/stats`

Each of `schedules`, `rooms`, `events`, `announcements`, and `assignments` supports:

- `GET /api/:system`
- `GET /api/:system/:id`
- `POST /api/:system`
- `PUT /api/:system/:id`
- `DELETE /api/:system/:id`

Special actions:

- `GET /api/rooms/:id/bookings`
- `POST /api/rooms/:id/book`
- `DELETE /api/rooms/:id/bookings/:bookingId`
- `POST /api/events/:id/register`
- `DELETE /api/events/:id/registrations/:studentId`
- `POST /api/agent/chat`

## Verification

```bash
npm run check
npm test
```

The integration suite uses an isolated temporary SQLite database. It covers all five seeded systems, CRUD plus live agent-tool visibility, malformed data, booking conflicts and exact boundaries, booking cancellation, registration counts, duplicate registration, cancellation, and missing-key behavior.

## Persistence behavior

The server creates `campus.db` and records a one-time seed marker on first run. Subsequent starts and `npm run seed` calls preserve both edited and intentionally deleted records, so dashboard changes survive reloads, restarts, and reseeding. To intentionally reset local data, stop the server, remove `campus.db`, and run the seed command again.
