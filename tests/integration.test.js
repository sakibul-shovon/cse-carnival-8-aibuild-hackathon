const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "campusos-"));
process.env.DATABASE_PATH = path.join(testDir, "campus-test.db");
process.env.GEMINI_API_KEY = "";
const { app, store, agent } = require("../server");
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;

async function request(url, options = {}) {
  const response = await fetch(`${base}${url}`, { headers: { "content-type": "application/json" }, ...options });
  const body = await response.json();
  return { status: response.status, body };
}

test.after(() => new Promise((resolve) => server.close(() => {
  store.db.close();
  fs.rmSync(testDir, { recursive: true, force: true });
  resolve();
})));

test("health and all five seeded collections", async () => {
  assert.equal((await request("/health")).status, 200);
  const config = await request("/config");
  assert.equal(config.status, 200);
  assert.equal(config.body.ai_provider, "Google Gemini");
  assert.equal(config.body.database_file, "campus-test.db");
  for (const system of ["schedules", "rooms", "events", "announcements", "assignments"]) {
    const response = await request(`/${system}`);
    assert.equal(response.status, 200);
    assert.ok(response.body.length > 0);
  }
  const exported = await request("/database/export");
  assert.equal(exported.status, 200);
  assert.deepEqual(Object.keys(exported.body.systems), ["schedules", "rooms", "events", "announcements", "assignments"]);
});

test("all five systems support CRUD, persistence, and live agent-tool visibility", async () => {
  const records = {
    schedules: { id: "sch-test", course: "CSE TEST", title: "Test course", day: "Sunday", start_time: "08:00", end_time: "09:00", room: "7A01", instructor: "QA", section: "T" },
    rooms: { id: "room-test", room_number: "8T01", type: "classroom", capacity: 20, equipment: ["projector"], floor: 8, status: "available", bookings: [] },
    events: { id: "evt-test", name: "Test event", description: "QA", date: "2026-10-01", start_time: "10:00", end_time: "11:00", end_date: "2026-10-01", venue: "7C01", organizer: "QA", capacity: 10, registered: 0, registrations: [], status: "upcoming" },
    announcements: { id: "ann-test", title: "Room update", body: "Original", date: "2026-09-04", priority: "high", posted_by: "QA", expires: "2026-09-30" },
    assignments: { id: "asgn-test", course: "CSE TEST", course_title: "Test", title: "QA", description: "QA", assigned_date: "2026-09-01", deadline: "2026-09-30", submission_platform: "Classroom", status: "pending", marks: 5 }
  };
  const patches = { schedules: { room: "7A07" }, rooms: { capacity: 21 }, events: { organizer: "Updated QA" }, announcements: { body: "Room 7A02 moved" }, assignments: { marks: 6 } };
  for (const [system, record] of Object.entries(records)) {
    assert.equal((await request(`/${system}`, { method: "POST", body: JSON.stringify(record) })).status, 201);
    assert.equal((await request(`/${system}/${record.id}`, { method: "PUT", body: JSON.stringify({ ...patches[system], id: "cannot-change" }) })).status, 200);
    assert.equal((await request(`/${system}/${record.id}`)).body.id, record.id);
  }
  const toolResult = await agent.execute("find_relevant_announcements", { query: "7A02 moved", priority: null, active_on: "2026-09-04" });
  assert.equal(toolResult[0].body, "Room 7A02 moved");
  assert.equal((await agent.execute("get_schedule", { id: "sch-test" })).room, "7A07");
  assert.equal((await agent.execute("get_room", { room: "8T01" })).capacity, 21);
  const { createStore } = require("../lib/store");
  const reopened = createStore({ dbPath: process.env.DATABASE_PATH });
  assert.equal(reopened.get("announcements", "ann-test").body, "Room 7A02 moved");
  reopened.db.close();
  for (const [system, record] of Object.entries(records)) {
    assert.equal((await request(`/${system}/${record.id}`, { method: "DELETE" })).status, 200);
    assert.equal((await request(`/${system}/${record.id}`)).status, 404);
  }
  store.seed();
  assert.equal((await request("/announcements/ann-test")).status, 404);
  const afterRestart = createStore({ dbPath: process.env.DATABASE_PATH });
  assert.equal(afterRestart.get("announcements", "ann-test"), null);
  afterRestart.db.close();
  assert.equal((await request("/schedules", { method: "POST", body: JSON.stringify({ id: "bad" }) })).status, 400);
});

test("room booking rejects overlap, allows exact boundary, then cancels", async () => {
  const booking = { booked_by: "QA", date: "2026-10-01", start_time: "15:00", end_time: "17:00", purpose: "Review" };
  const first = await request("/rooms/room-002/book", { method: "POST", body: JSON.stringify(booking) });
  assert.equal(first.status, 201);
  assert.equal((await request("/rooms/room-002/book", { method: "POST", body: JSON.stringify({ ...booking, start_time: "16:00", end_time: "18:00" }) })).status, 409);
  assert.equal((await request("/rooms/room-002/book", { method: "POST", body: JSON.stringify({ ...booking, start_time: "15:30", end_time: "16:30" }) })).status, 409);
  assert.equal((await request("/rooms/room-002/book", { method: "POST", body: JSON.stringify({ ...booking, start_time: "14:00", end_time: "17:00" }) })).status, 409);
  const earlier = await request("/rooms/room-002/book", { method: "POST", body: JSON.stringify({ ...booking, start_time: "14:00", end_time: "15:00" }) });
  assert.equal(earlier.status, 201);
  const boundary = await request("/rooms/room-002/book", { method: "POST", body: JSON.stringify({ ...booking, start_time: "17:00", end_time: "18:00" }) });
  assert.equal(boundary.status, 201);
  assert.equal((await agent.execute("find_available_rooms", { date: "2026-10-01", start_time: "16:30", end_time: "17:30", minimum_capacity: 5, required_equipment: ["projector"], room_type: null })).some((room) => room.id === "room-002"), false);
  assert.equal((await request(`/rooms/room-002/bookings/${first.body.booking.booking_id}`, { method: "DELETE" })).status, 200);
  assert.equal((await request(`/rooms/room-002/bookings/${earlier.body.booking.booking_id}`, { method: "DELETE" })).status, 200);
  assert.equal((await request(`/rooms/room-002/bookings/${boundary.body.booking.booking_id}`, { method: "DELETE" })).status, 200);
  assert.equal((await request("/rooms/room-002/bookings")).body.length, 0);
});

test("event registration preserves aggregate count and rejects duplicates", async () => {
  const before = (await request("/events/evt-007")).body.registered;
  const registration = { student_id: "QA-001", name: "QA Student" };
  const created = await request("/events/evt-007/register", { method: "POST", body: JSON.stringify(registration) });
  assert.equal(created.status, 201);
  assert.equal(created.body.registered, before + 1);
  assert.equal((await request("/events/evt-007/register", { method: "POST", body: JSON.stringify(registration) })).status, 409);
  assert.equal((await request("/events/evt-007/registrations/QA-001", { method: "DELETE" })).status, 200);
  assert.equal((await request("/events/evt-007")).body.registered, before);
  assert.equal((await request("/events/evt-006/register", { method: "POST", body: JSON.stringify({ student_id: "QA-FULL", name: "Full Test" }) })).status, 409);
});

test("AI endpoint fails gracefully when no key is configured", async () => {
  const requiredTools = ["get_schedules", "get_rooms", "get_room", "get_events", "get_event", "get_announcements", "get_assignments", "search_rooms", "find_available_rooms", "find_upcoming_events", "find_assignments_due", "find_relevant_announcements", "find_student_schedule", "book_room", "cancel_room_booking", "register_for_event", "cancel_event_registration"];
  const implementedTools = agent.tools.map((tool) => tool.name);
  assert.ok(requiredTools.every((name) => implementedTools.includes(name)));
  assert.ok(implementedTools.includes("find_next_class"));
  assert.ok(implementedTools.includes("find_assignments_due_this_week"));
  assert.ok(implementedTools.includes("find_drop_in_options"));
  assert.ok((await agent.execute("find_next_class", {})).next_class);
  const dropIn = await agent.execute("find_drop_in_options", { date: "2026-09-06", start_time: "09:00", end_time: "14:00" });
  assert.ok(Array.isArray(dropIn.classes_in_window));
  assert.ok(Array.isArray(dropIn.events_in_window));
  assert.match(agent.authorizeAction("book_room", { room: "7A02" }, "Just book me any room tomorrow afternoon"), /exact date, start time, and end time/);
  assert.equal(agent.authorizeAction("book_room", { room: "7A02", date: "2026-09-05", start_time: "15:00", end_time: "17:00", booked_by: "QA", purpose: "Student reservation via CampusOS" }, "Book Room 7A02 tomorrow from 3 PM to 5 PM"), null);
  assert.equal(agent.authorizeAction("book_room", { room: "7A02", date: "2026-09-05", start_time: "15:00", end_time: "17:00", booked_by: "QA", purpose: "Project meeting" }, "Book Room 7A02 tomorrow from 3 PM to 5 PM for a project meeting"), null);
  const response = await request("/agent/chat", { method: "POST", body: JSON.stringify({ message: "When is my next class?" }) });
  assert.equal(response.status, 503);
  assert.match(response.body.error, /GEMINI_API_KEY/);
});

test("AI loop executes a real structured tool call and returns the post-tool answer", async () => {
  const { createAgent } = require("../lib/agent");
  let calls = 0;
  const fakeClient = { interactions: { create: async (request) => {
    calls += 1;
    assert.ok(request.tools.some((tool) => tool.name === "get_schedules"));
    if (calls === 1) return {
      id: "interaction-1",
      steps: [{ type: "function_call", id: "call-1", name: "get_schedules", arguments: { id: "sch-001" } }]
    };
    assert.equal(request.previous_interaction_id, "interaction-1");
    const result = JSON.parse(request.input[0].result[0].text)[0];
    return { id: "interaction-2", steps: [{ type: "model_output" }], output_text: `${result.course} is in ${result.room}.` };
  } } };
  const loopAgent = createAgent(store, { client: fakeClient });
  const result = await loopAgent.chat("Where is schedule sch-001?");
  assert.equal(calls, 2);
  assert.equal(result.tool_calls, 1);
  assert.match(result.message, /CSE/);
});

test("judge sample-query constraints are supported by live tools", async () => {
  assert.ok((await agent.execute("find_next_class", {})).next_class);
  const wednesday = await agent.execute("get_schedules", { day: "Wednesday", course: null });
  assert.ok(wednesday.length > 0 && wednesday.every((item) => item.day === "Wednesday"));
  const due = await agent.execute("find_assignments_due_this_week", {});
  assert.ok(Array.isArray(due.assignments) && due.academic_week.from_date <= due.academic_week.to_date);
  const high = await agent.execute("get_announcements", { priority: "high" });
  assert.ok(high.length > 0 && high.every((item) => item.priority === "high"));
  const labs = await agent.execute("search_rooms", { minimum_capacity: 30, required_equipment: ["projector"], room_type: "lab", status: null });
  assert.ok(labs.length > 0 && labs.every((room) => room.type === "lab" && room.capacity >= 30 && room.equipment.includes("projector")));
  const available = await agent.execute("find_available_rooms", { date: "2026-09-05", start_time: "14:00", end_time: "16:00", minimum_capacity: 5, required_equipment: ["projector"], room_type: null });
  assert.ok(available.length > 0);
  assert.match((await agent.execute("get_event", { event: "Deep Learning" })).name, /Deep Learning/);
});
