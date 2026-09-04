# CampusOS Backend

CampusOS Node.js, Express, SQL Server, and Groq tool-calling backend.

## Setup

```bash
npm install
npm run dev
```

The server starts on `http://localhost:4000` by default. The health check is available at `/health`.

<<<<<<< Updated upstream
The API reads the current CampusOS database for campus data. The assistant endpoint is `POST /api/ai/chat`; it requires `GEMINI_API_KEY` in `.env` and uses Gemini model-selected function calls to execute database tools.
=======
Authentication endpoints are `POST /api/auth/register`, `POST /api/auth/login`, and `GET /api/auth/me`. Registration creates student accounts only. The seeded development admin is `admin@campusos.local` with password `CampusOSAdmin2026!`; change this password before production use.

The API reads the current CampusOS database for campus data. The assistant endpoint is `POST /api/ai/chat`; it requires `GROQ_API_KEY` in `.env` and uses model-selected function calls to execute database tools.
>>>>>>> Stashed changes

Database configuration is read from `.env`. Keep real credentials local and use `.env.example` as the template.

Run `schema.sql` and `seed.sql` in SSMS before using database-backed routes. For Windows Authentication, ensure the current Windows account has access to the `CampusOS` database and that SQL Server Browser/ODBC Driver 18 are available for the named instance.
