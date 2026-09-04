const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ quiet: true });

const { SYSTEMS, HttpError, createStore } = require("./lib/store");
const { createAgent } = require("./lib/agent");

const store = createStore({ dbPath: process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : path.join(__dirname, "campus.db") });
const agent = createAgent(store);
const app = express();

app.disable("x-powered-by");
const corsOrigins = String(process.env.CORS_ORIGIN || "").split(",").map((value) => value.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigins.length ? corsOrigins : false }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.use(express.json({ limit: "1mb" }));

const route = (handler) => async (req, res, next) => {
  try { await handler(req, res); } catch (error) { next(error); }
};

app.get("/api/health", (req, res) => res.json({ ok: true, message: "CampusOS backend is running", database: "sqlite" }));
app.get("/api/config", (req, res) => res.json({
  ai_configured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
  ai_provider: "Google Gemini",
  database_file: path.basename(store.db.name),
  student: { student_id: process.env.DEMO_STUDENT_ID || "20-40532", name: process.env.DEMO_STUDENT_NAME || "Dr. Doom" }
}));
app.get("/api/stats", route((req, res) => {
  const stats = Object.fromEntries(SYSTEMS.map((system) => [system, store.list(system).length]));
  stats.room_bookings = store.list("rooms").reduce((total, room) => total + (room.bookings || []).length, 0);
  stats.event_registrations = store.list("events").reduce((total, event) => total + Number(event.registered || 0), 0);
  res.json(stats);
}));
app.get("/api/database/export", route((req, res) => {
  res.setHeader("Content-Disposition", 'inline; filename="campusos-database.json"');
  res.json({ exported_at: new Date().toISOString(), source: "campus.db (SQLite)", systems: Object.fromEntries(SYSTEMS.map((system) => [system, store.list(system)])) });
}));
app.get("/api/meta", route((req, res) => res.json({ systems: SYSTEMS.map((name) => ({ name, count: store.list(name).length })) })));

app.get("/api/rooms/:id/bookings", route((req, res) => {
  const room = store.findRoom(req.params.id);
  if (!room) throw new HttpError(404, "Room not found");
  res.json(room.bookings || []);
}));
app.post("/api/rooms/:id/book", route((req, res) => res.status(201).json(store.bookRoom(req.params.id, req.body || {}))));
app.delete("/api/rooms/:id/bookings/:bookingId", route((req, res) => res.json(store.cancelBooking(req.params.id, req.params.bookingId))));

app.post("/api/events/:id/register", route((req, res) => res.status(201).json(store.register(req.params.id, req.body || {}))));
app.delete("/api/events/:id/registrations/:studentId", route((req, res) => res.json(store.cancelRegistration(req.params.id, req.params.studentId))));

app.post("/api/agent/chat", route(async (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (!message) throw new HttpError(400, "A message is required");
  if (message.length > 4000) throw new HttpError(400, "Message must be 4000 characters or fewer");
  res.json(await agent.chat(message, req.body?.student || {}));
}));

for (const system of SYSTEMS) {
  app.get(`/api/${system}`, route((req, res) => res.json(store.list(system))));
  app.get(`/api/${system}/:id`, route((req, res) => {
    const record = store.get(system, req.params.id);
    if (!record) throw new HttpError(404, "Record not found");
    res.json(record);
  }));
  app.post(`/api/${system}`, route((req, res) => res.status(201).json(store.create(system, req.body))));
  app.put(`/api/${system}/:id`, route((req, res) => res.json(store.update(system, req.params.id, req.body || {}))));
  app.delete(`/api/${system}/:id`, route((req, res) => {
    store.remove(system, req.params.id);
    res.json({ success: true, deleted_id: req.params.id });
  }));
}

app.use("/api", (req, res) => res.status(404).json({ error: "API route not found" }));
app.use(express.static(path.join(__dirname, "public")));
app.get("*splat", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) return res.status(400).json({ error: "Request body contains invalid JSON" });
  const status = Number(error.status) || 500;
  if (status >= 500 && !(error instanceof HttpError)) console.error(error);
  res.status(status).json({ error: error.message || "Unexpected server error" });
});

let server;
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  server = app.listen(port, () => console.log(`CampusOS running on http://localhost:${port}`));
  const shutdown = () => server.close(() => { store.db.close(); process.exit(0); });
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

module.exports = { app, store, agent, server };
