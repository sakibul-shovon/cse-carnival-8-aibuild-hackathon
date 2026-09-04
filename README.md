# CampusOS

CampusOS is a live university operations workspace for students. It brings schedules, rooms, events, announcements, and assignments into one polished dashboard, then layers a tool-using campus agent on top. Dashboard edits and agent actions share the same D1 database, so every answer, room booking, and event registration reflects the latest data immediately.

## What works

- View, search, add, edit, and delete records in all five campus systems
- Persist changes in a Cloudflare D1-compatible SQLite database
- Book rooms with schedule and booking conflict checks, then cancel your own bookings
- Register for events, detect duplicate/full registrations, and cancel your registration
- Ask the agent the supplied judging queries and inspect the real tools it called
- Use an optional OpenAI Responses API function-calling path, with a no-key local tool router as a reliable fallback
- Responsive navigation, loading/empty/error states, and inline success feedback

## Tech stack

- **Frontend:** React 19, TypeScript, Vinext, Tailwind CSS, shadcn components, Lucide icons
- **Backend:** Vinext route handlers running on the Cloudflare Workers runtime
- **Database:** Cloudflare D1 / SQLite, with a checked-in migration and automatic seed import from `data/*.json`
- **AI:** OpenAI Responses API with strict custom functions when `OPENAI_API_KEY` is present; deterministic server-side tool execution otherwise

## Run locally

Requirements: Node.js 22.13 or newer and npm.

```bash
cd application
npm install
npm run db:migrate:local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first data request automatically loads the five supplied JSON datasets into D1. Later restarts keep the database you changed.

If you want to start from the original seed again, remove `application/.wrangler/` and rerun `npm run db:migrate:local` before starting the app.

## Environment variables

The app runs without any environment variables. To enable the LLM-backed function-calling path, copy `.env.example` to `application/.env.local` and set:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- `OPENAI_API_KEY` is optional and must never be committed.
- `OPENAI_MODEL` is optional; it defaults to `gpt-5.4-mini`.
- `NEXT_PUBLIC_SITE_URL` is used only for social-preview metadata.

## Using the agent

Try these in the Campus agent panel:

- “When is my next class?”
- “What classes do I have on Wednesday?”
- “What assignments are due this week?”
- “Show me all high priority announcements.”
- “Which labs have a projector and can fit at least 30 people?”
- “Book Room 7A02 tomorrow from 3 PM to 5 PM.”
- “Register me for the Guest Lecture on Deep Learning.”
- “I need a room for 5 people with a projector, tomorrow between 2 and 4.”

The agent reads the live database for every request. Update a notice or room in the dashboard, then ask about it—the response will use the new value. Vague booking requests prompt for missing details, and unauthorized destructive or other-student actions are refused.

## Project structure

```text
application/
  app/api/agent/       Agent endpoint and OpenAI tool loop
  app/api/records/     CRUD endpoint for all five systems
  app/api/actions/     Booking and registration actions
  components/          CampusOS interface and UI primitives
  db/                  Drizzle schema
  drizzle/             D1 migration
  lib/                 Shared data access, schemas, seeds, and tools
data/                   Original hackathon seed JSON
schema/                 Challenge schema reference
sample_queries/         Judging query examples
```

## Production build

```bash
cd application
npm run build
```

The build emits a Cloudflare Worker-compatible server bundle and includes the D1 migration metadata required by the hosting platform.
