# CampusOS — AI Build Hackathon

An intelligent university platform powered by an AI agent that understands and acts on real-time campus data.

---

## The Challenge

Students struggle daily with scattered campus information — class changes buried in group chats, deadlines forgotten until the last minute, no easy way to know what's happening on campus right now.

Your job: build **CampusOS** — a two-part app with a data dashboard and an AI agent that always reads live data.

Read the full problem statement → [`PROBLEM_STATEMENT.md`](./PROBLEM_STATEMENT.md)

---

## Repository Structure

```
campusos-hackathon/
│
├── README.md                    ← You are here
├── PROBLEM_STATEMENT.md         ← Full problem statement + scoring
├── SUBMISSION.md                ← How and where to submit
├── docs/
│   └── API_CONTRACT.md          ← Versioned frontend/backend/agent contract
│
├── data/                        ← Seed data (load these into your backend)
│   ├── schedules.json
│   ├── rooms.json
│   ├── events.json
│   ├── announcements.json
│   ├── assignments.json
│   └── users.json               ← MVP demo identity and enrollments
│
├── backend/
│   ├── app/schemas/             ← Executable Pydantic v2 API contracts
│   ├── app/services/            ← Shared deterministic business rules
│   └── tests/                   ← Contract and relevance tests
│
├── schema/
│   └── schema.md                ← Field names, types, and constraints for all 5 systems
│
└── sample_queries/
    └── sample_queries.md        ← Queries we will use when judging your agent
```

---

## How to Participate

### 1. Fork the repository

Click **Fork** in the top-right corner of this repo's GitHub page. This creates your own copy under your GitHub account, where you'll build your solution.

### 2. Clone your fork

```bash
git clone https://github.com/YOUR_USERNAME/campusos-hackathon.git
cd campusos-hackathon
```

### 3. Build your solution inside your fork

> Your solution lives in your fork — do not open a pull request to this repo.

### 4. Making your fork private

By default, a fork is public. If you want to keep your work hidden from other participants while you build:

1. Go to your fork on GitHub
2. Open **Settings** (top of the repo page)
3. Scroll to the **Danger Zone** at the bottom
4. Click **Change repository visibility** → **Make private**
5. Confirm by typing the repository name

> **You may keep your fork private during the hackathon period, but it must be switched back to public by 8:30 PM on the submission deadline.** Repositories still private after that time will not be judged. To make it public again, repeat the steps above and choose **Make public** instead.

### 5. Submit

Submit your fork's public URL via the instructions in [`SUBMISSION.md`](./SUBMISSION.md).

---

## Quick Links

| Resource | Link |
|----------|------|
| Full problem statement | [`PROBLEM_STATEMENT.md`](./PROBLEM_STATEMENT.md) |
| Development roadmap | [`docs/DEVELOPMENT_ROADMAP.md`](./docs/DEVELOPMENT_ROADMAP.md) |
| API contract | [`docs/API_CONTRACT.md`](./docs/API_CONTRACT.md) |
| Data schema | [`schema/schema.md`](./schema/schema.md) |
| Sample agent queries | [`sample_queries/sample_queries.md`](./sample_queries/sample_queries.md) |
| Submission guide | [`SUBMISSION.md`](./SUBMISSION.md) |

---

## Seed Data Overview

| File | Records | What It Contains |
|------|---------|-----------------|
| `schedules.json` | 24 | Class timetable — course, day, time, room, instructor |
| `rooms.json` | 20 | Rooms 7A01–7A07, 7B01–7B08, 7C01–7C05 with equipment and bookings |
| `events.json` | 7 | Campus events with registration lists |
| `announcements.json` | 8 | Notices with priority levels and expiry dates |
| `assignments.json` | 8 | Course assignments with deadlines and submission status |
| `users.json` | 1 | MVP demo user and course-section enrollments |

> **Important:** These JSON files are only the starting/seed data — not the database itself. Load them into a real backend (a database, or at minimum a backend service with persistent storage) on app startup. Your dashboard and AI agent must both read from and write to that backend, not the static JSON files directly. If you add, edit, or delete a record, the change must be saved in your backend and still be there after a reload — the JSON files in this repo will not update. The agent is also expected to always query the current backend state, not a cached or hardcoded copy of the seed data.

---

Good luck. Build something that actually works.
