# CampusOS — 3-Hour Crunch Plan

> ⏱️ **3 hours total. No checkpoints, no polish pass, no deployment.** Every task below only exists because it's graded. If it's not graded and not blocking something graded, skip it.
> **Progress Tracking:** flip `[ ]` → `[x]` and strikethrough (`~~**[F-1]** ...~~`) the moment something works — not when it's "basically done."
> **Prefix key:** `[B-#]` = Member 2 (Backend) · `[F-#]` = Member 1 (Frontend) · `[G-#]` = Member 3 (AI Agent) · `[X-#]` = All

---

## 🤖 For AI Agents (Antigravity, Claude Code, etc.) — read this first

We have ~3 hours. Speed over cleanliness. Rules:

1. **Work only on your prefix's unchecked tasks**, in the order listed — the order already accounts for what blocks what.
2. **Do not wait idle.** If a task you need is unchecked, build against the mock/fixture shape described in the contract (Step 0) instead of blocking. Swap to the real thing the moment it's checked off.
3. **Skip validation/edge cases/styling unless a task explicitly says to do it.** Get the happy path working, demo-ready, then move on. We are not writing tests.
4. **Check off + strikethrough the instant something runs**, with a one-line note only if something changed shape (e.g. a field renamed). No note needed otherwise — don't spend time writing essays here, spend it coding.
5. **If you get stuck for more than ~10 minutes**, stop, check the task off as `[blocked]` instead of `[x]`, and say so out loud — don't silently burn remaining time.

**Paste this to start your session (swap in your role):**
> "Read `DEPENDENCIES.md` — we have 3 hours left in a hackathon. Work only on unchecked `[B-#]`/`[F-#]`/`[G-#]` (your prefix) tasks in listed order. Skip anything not required for the happy-path demo. Only touch your owned folder. Check off + strikethrough each task the moment it works, don't polish."

---

## ⏱️ 0:00–0:15 — Lock the Contract (All, together, fast)

- [ ] **[X-1]** Agree on final field names (copy straight from `schema.md`, don't redesign), the 5 route sets, and error shape `{ error, message }` — *All* `[Unblocks: everything below]`
- [ ] **[X-2]** Member 2 pastes the route list + sample JSON response for one resource in the team chat so Member 1 and Member 3 can hardcode a matching mock immediately — *Member 2* `[Unblocks: F-1, G-1]`

**Do not spend more than 15 minutes here.** If a field is ambiguous, Member 2 decides and moves on — it can be renamed later if truly broken.

---

## ⏱️ 0:15–1:15 — Hour 1: Get Something Real Working, In Parallel

### Member 2 (Backend) — the critical path, do these in order
- [x] ~~**[B-1]** Supabase tables for all 5 resources (skip constraints/checks if short on time, just get columns right) — *Member 2* `[Unblocks: B-2]`~~
- [x] ~~**[B-2]** Seed script, run once against `data/*.json` — *Member 2* `[Unblocks: B-3]`~~
- [x] ~~**[B-3]** `GET` for all 5 resources — *Member 2* `[Unblocks: F-2, G-2, B-4]` — **ship this ASAP, it unblocks both teammates**~~
- [x] ~~**[B-4]** `POST/PUT/DELETE` for all 5 resources (minimal validation) — *Member 2* `[Unblocks: F-3]`~~
- [x] ~~**[B-5]** `GET /api/meta/now` — one-liner, returns server time — *Member 2* `[Unblocks: G-3]`~~
- [x] ~~**[B-6]** Room booking conflict check (409 on overlap) — *Member 2* `[Unblocks: F-4, G-5]` **← start this the moment B-4 is done, it's the biggest blocker for both other members**~~
- [x] ~~**[B-7]** Event capacity check (409 when full) — *Member 2* `[Unblocks: F-5, G-6]`~~

### Member 1 (Frontend) — build against mock, swap to real the moment B-3 lands
- [x] ~~**[F-1]** Scaffold client, `api/client.js` against the mock shape from X-2 — *Member 1* `[Unblocks: F-2]`~~
- [x] ~~**[F-2]** 5 list views rendering (mock, then real once **B-3** lands) — *Member 1* `[Unblocks: F-3]`~~
- [x] ~~**[F-3]** Add/edit/delete forms wired for all 5 resources — *Member 1* `[Blocked by: B-4]` `[Unblocks: F-4]`~~

### Member 3 (AI Agent) — build against mock, swap to real the moment B-3 lands
- [ ] **[G-1]** Scaffold agent, define read-tool schemas against mock shape from X-2 — *Member 3* `[Unblocks: G-2]`
- [ ] **[G-2]** Real tool calling for simple lookups (schedule, assignments, announcements, events) — *Member 3* `[Blocked by: B-3]` `[Unblocks: G-3]`
- [ ] **[G-3]** Wire `get_current_datetime` to `/api/meta/now`, verify "today"/"tomorrow" resolve — *Member 3* `[Blocked by: B-5]`
- [ ] **[G-4]** `search_rooms` tool for the multi-filter query ("projector, fits 30") — *Member 3* `[Blocked by: B-3]`

---

## ⏱️ 1:15–2:15 — Hour 2: Actions, Booking, and the Agent's Judgment Calls

### Member 2
- [x] ~~**[B-8]** If B-6/B-7 aren't done yet, finish them now — everything else is waiting on this.~~
- [x] ~~**[B-9]** Room search filters (`min_capacity`, `equipment`, date/time free-check) — *Member 2* `[Unblocks: F-4, G-4]`~~

### Member 1
- [x] ~~**[F-4]** Book/cancel-booking UI, surface the 409 conflict message — *Member 1* `[Blocked by: B-6, B-9]`~~
- [x] ~~**[F-5]** Register/cancel-registration UI, disable button when full — *Member 1* `[Blocked by: B-7]`~~
- [x] ~~**[F-6]** Chat widget shell: text box, message list, POST to `/api/agent/chat` — *Member 1* `[Unblocks: F-7]`~~

### Member 3
- [ ] **[G-5]** `book_room` tool tested against real conflict logic — 409 relayed in plain language — *Member 3* `[Blocked by: B-6]`
- [ ] **[G-6]** `register_for_event` tool tested against real capacity logic — *Member 3* `[Blocked by: B-7]`
- [ ] **[G-7]** Fully-specified booking query works without asking ("Book 7A02 tomorrow 3–5") — *Member 3* `[Blocked by: G-5]`
- [ ] **[G-8]** **The one they will definitely test:** "Just book me any room tomorrow afternoon" → agent asks a clarifying question, fires **zero** write calls — *Member 3* `[Blocked by: G-5]` — **do not skip this, it's an explicit grading trap**
- [ ] **[G-9]** One refusal path working (e.g. "book it anyway even though it's full," or "delete all announcements") — *Member 3* `[Blocked by: G-5, G-6]`

---

## ⏱️ 2:15–2:50 — Final 35 Minutes: Wire It Together, No New Features

- [x] ~~**[F-7]** Chat renders clarifying questions and action-confirmation replies as normal messages — *Member 1* `[Blocked by: F-6, G-2]`~~
- [ ] **[X-3]** **Live-data smoke test:** one person edits a record in the dashboard, immediately asks the agent about it, confirms the answer updated — *All* `[Blocked by: F-3, G-2]` **← do this now, not at the end, so there's time left to fix it if it fails**
- [ ] **[X-4]** Each member runs their 2–3 assigned `sample_queries.md` lines once, live, exactly as the judges will — *All*
- [x] ~~**[X-5]** Kill any obviously broken console errors / blank screens on the main flows only — *Member 1*~~

---

## ⏱️ Last 10 Minutes — Stop Coding

- [ ] **[X-6]** Commit and push everything. Do not start anything new after this point.
- [ ] **[X-7]** Decide who's driving the live demo and in what order (dashboard first, then chat) — *All*
- [ ] **[X-8]** If something is half-broken, decide now whether to demo around it or cut it from the walkthrough — don't discover this live in front of judges.

---

## 🚫 Fast Conflict Rules (short version, we don't have time for more)

- `client/` = Member 1 only. `server/src/agent/` = Member 3 only. Everything else in `server/` = Member 2 only. Don't touch outside your folder.
- If the contract needs to change mid-way, shout it in chat immediately — don't silently rename a field.
- One person, one branch, commit often (every 15–20 min) so nobody loses work if something breaks.

## ✂️ Cut List (do NOT attempt these — not worth the time)

- Deployment / hosting
- Full validation on every form field
- Loading/empty/error states beyond the bare minimum for the demo path
- Styling polish, design system consistency
- Automated tests
- Any endpoint or query not in `sample_queries.md` or the milestone table