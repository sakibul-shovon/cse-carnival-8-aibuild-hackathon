# AGENTS.md — CampusOS Hackathon Starter

## What This Repo Is

A **starter repo** — not a built app. It contains seed data and specs. Your job is to build the full CampusOS application (dashboard + AI agent) on top of it.

## Critical Requirement

The AI agent **must use real tool/function calling** — not prompt chaining. Judges will verify this. Both the dashboard and agent must run from a single submission with working local setup steps in the README.

## Data Rules

- `data/*.json` files are **seed data only** — load them into a real backend on startup
- Dashboard and agent must read/write to the backend, never the static JSON files
- Edits via the dashboard must persist and immediately be visible to the agent
- All times are 24h `"HH:MM"`, all dates ISO `"YYYY-MM-DD"`, week runs Sun–Thu
- Room IDs follow `[Floor][Wing][Number]`: 7A01–7A07 (classrooms), 7B01–7B08 (labs), 7C01–7C05 (seminars)

## Schema Reference

Five systems with exact fields in `schema/schema.md`. Key gotchas:
- Rooms have nested `bookings[]` array — check for conflicts before booking
- Events have nested `registrations[]` array — check capacity before registering
- Announcements have `expires` field — stale notices should not surface

## Judging

| Area | Marks |
|------|-------|
| Data management (backend loaded + displayed) | 20 |
| CRUD (add/edit/delete, persists) | 20 |
| AI Agent (answers, actions, live data, vague/refusal handling) | 40 |
| UI/UX | 20 |

Agent is scored on: correct answers across data, correct actions (booking/registering), always using latest data, and sensible handling of vague/unauthorized requests.

## Sample Queries to Pass

Judges will ask queries from `sample_queries/sample_queries.md` and also edit data mid-evaluation, then immediately query the agent. See that file for the exact list.

## Setup Notes

- Copy `.env.example` to `.env` — never commit real API keys
- No tech stack restrictions — use any language, framework, LLM, or platform
