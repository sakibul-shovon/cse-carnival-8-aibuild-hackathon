# CampusOS

CampusOS is an AI-powered campus intelligence platform that unifies schedules, rooms, assignments, events, and announcements behind a typed API and an OpenAI tool-calling assistant.

## Architecture

This repository is an npm workspace with strict runtime boundaries:

```text
.
├── backend/            Express + TypeScript API, service layer, and AI orchestration
├── database/           Prisma schema, migrations, seed fixtures, and seed runner
├── docs/               Architecture, database, API, and AI design decisions
├── frontend/           Next.js + TypeScript + Tailwind + Shadcn-style UI
└── tests/              Backend and frontend verification suites
```

Backend feature dependencies point inward:

```text
HTTP route → validation → controller → service → model/repository → Prisma → MySQL
                                      ↑
OpenAI agent → function tool ─────────┘
```

The AI layer cannot import the database client. Its five allowlisted tools call the same services used by the REST API.

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop or another Docker Compose runtime
- An OpenAI API key for the AI assistant (the rest of the application works without one)

## Local setup

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

   On PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Install workspace dependencies:

   ```bash
   npm install
   ```

3. Start MySQL and wait for its health check:

   ```bash
   docker compose up -d mysql
   docker compose ps
   ```

4. Generate the Prisma client, apply migrations, and load demo data:

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. Start the frontend and backend together:

   ```bash
   npm run dev
   ```

Open the dashboard at [http://localhost:3000](http://localhost:3000). The API listens at `http://localhost:4000`; its health endpoint is `GET /health`.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Prisma MySQL connection string | Docker Compose credentials |
| `BACKEND_PORT` | Express listen port | `4000` |
| `FRONTEND_URL` | Allowed browser origin | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Browser-visible API base URL | `http://localhost:4000/api/v1` |
| `OPENAI_API_KEY` | Enables the AI assistant | empty |
| `OPENAI_MODEL` | Responses API model ID | `gpt-5-mini` |
| `DEV_USER_ID` | Local request identity fallback | `20-40532` |

Never commit `.env` or API keys. Production deployments should replace the development identity header with a verified identity provider.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run both workspaces in watch mode |
| `npm run build` | Build the API and Next.js application |
| `npm run typecheck` | Type-check both workspaces |
| `npm test` | Run backend and frontend tests |
| `npm run db:migrate` | Create/apply a development Prisma migration |
| `npm run db:seed` | Reset and load deterministic hackathon fixtures |
| `npm run db:studio` | Open Prisma Studio |

## Documentation

- [Architecture](docs/architecture.md)
- [Database design](docs/database-design.md)
- [API documentation](docs/api-documentation.md)
- [AI agent design](docs/ai-agent-design.md)
- [Sample evaluation queries](docs/sample-queries.md)

## API conventions

Successful responses use one envelope:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

Errors use the same top-level shape with `success: false`, `data: null`, and a stable `error.code`. See [API documentation](docs/api-documentation.md) for routes and examples.

## License

See [LICENSE](LICENSE).
