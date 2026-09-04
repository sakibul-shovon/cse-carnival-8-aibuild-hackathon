const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SYSTEMS = ["schedules", "rooms", "events", "announcements", "assignments"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const ROOM_TYPES = ["classroom", "lab", "seminar"];
const ROOM_STATUSES = ["available", "unavailable"];
const EVENT_STATUSES = ["upcoming", "ongoing", "completed", "cancelled", "full"];
const PRIORITIES = ["high", "medium", "low"];
const ASSIGNMENT_STATUSES = ["pending", "submitted", "graded", "late"];
const FIELDS = {
  schedules: ["id", "course", "title", "day", "start_time", "end_time", "room", "instructor", "section"],
  rooms: ["id", "room_number", "type", "capacity", "equipment", "floor", "status", "bookings"],
  events: ["id", "name", "description", "date", "start_time", "end_time", "end_date", "venue", "organizer", "capacity", "registered", "registrations", "status"],
  announcements: ["id", "title", "body", "date", "priority", "posted_by", "expires"],
  assignments: ["id", "course", "course_title", "title", "description", "assigned_date", "deadline", "submission_platform", "status", "marks"]
};
const NON_STRING_FIELDS = new Set(["capacity", "equipment", "floor", "bookings", "registered", "registrations", "marks"]);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const isDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};
const isTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
const minutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const overlaps = (aStart, aEnd, bStart, bEnd) => minutes(aStart) < minutes(bEnd) && minutes(bStart) < minutes(aEnd);
const required = (record, fields) => {
  for (const field of fields) {
    if (record[field] === undefined || record[field] === null || String(record[field]).trim() === "") {
      throw new HttpError(400, `${field} is required`);
    }
  }
};
const enumValue = (record, field, values) => {
  if (!values.includes(record[field])) throw new HttpError(400, `${field} must be one of: ${values.join(", ")}`);
};
const validWindow = (start, end, label = "Time") => {
  if (!isTime(start) || !isTime(end)) throw new HttpError(400, `${label} values must use HH:MM (24-hour) format`);
  if (minutes(start) >= minutes(end)) throw new HttpError(400, `${label} start must be before end`);
};

function validateBooking(booking, requireId = false) {
  required(booking, [...(requireId ? ["booking_id"] : []), "booked_by", "date", "start_time", "end_time", "purpose"]);
  const allowed = new Set(["booking_id", "booked_by", "date", "start_time", "end_time", "purpose"]);
  if (Object.keys(booking).some((key) => !allowed.has(key))) throw new HttpError(400, "Booking contains unsupported fields");
  if ([...(requireId ? ["booking_id"] : []), "booked_by", "date", "start_time", "end_time", "purpose"].some((key) => typeof booking[key] !== "string")) throw new HttpError(400, "Booking text fields must be strings");
  if (!isDate(booking.date)) throw new HttpError(400, "date must be a valid YYYY-MM-DD date");
  validWindow(booking.start_time, booking.end_time, "Booking time");
}

function validate(system, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new HttpError(400, "A JSON record is required");
  const record = structuredClone(input);
  required(record, ["id"]);
  if (!FIELDS[system]) throw new HttpError(404, "Unknown campus system");
  if (Object.keys(record).some((key) => !FIELDS[system].includes(key))) throw new HttpError(400, `Record contains unsupported fields for ${system}`);
  if (typeof record.id !== "string") throw new HttpError(400, "id must be a string");
  record.id = record.id.trim();
  for (const field of FIELDS[system]) {
    if (record[field] !== undefined && !NON_STRING_FIELDS.has(field) && typeof record[field] !== "string") throw new HttpError(400, `${field} must be a string`);
  }

  if (system === "schedules") {
    required(record, ["course", "title", "day", "start_time", "end_time", "room", "instructor", "section"]);
    enumValue(record, "day", DAYS);
    validWindow(record.start_time, record.end_time, "Class time");
  } else if (system === "rooms") {
    required(record, ["room_number", "type", "capacity", "floor", "status"]);
    enumValue(record, "type", ROOM_TYPES);
    enumValue(record, "status", ROOM_STATUSES);
    record.capacity = Number(record.capacity);
    record.floor = Number(record.floor);
    if (!Number.isInteger(record.capacity) || record.capacity < 1 || record.capacity > 1000) throw new HttpError(400, "capacity must be an integer from 1 to 1000");
    if (!Number.isInteger(record.floor) || record.floor < 0 || record.floor > 100) throw new HttpError(400, "floor must be a reasonable integer");
    if (!Array.isArray(record.equipment)) throw new HttpError(400, "equipment must be an array");
    if (record.equipment.some((item) => typeof item !== "string" || !item.trim())) throw new HttpError(400, "equipment entries must be non-empty strings");
    if (!Array.isArray(record.bookings)) record.bookings = [];
    for (const booking of record.bookings) validateBooking(booking, true);
    const bookingIds = record.bookings.map((booking) => booking.booking_id);
    if (new Set(bookingIds).size !== bookingIds.length) throw new HttpError(400, "bookings must contain unique booking_id values");
    for (let index = 0; index < record.bookings.length; index += 1) {
      for (let other = index + 1; other < record.bookings.length; other += 1) {
        const first = record.bookings[index];
        const second = record.bookings[other];
        if (first.date === second.date && overlaps(first.start_time, first.end_time, second.start_time, second.end_time)) throw new HttpError(409, `Bookings ${first.booking_id} and ${second.booking_id} overlap`);
      }
    }
  } else if (system === "events") {
    required(record, ["name", "description", "date", "start_time", "end_time", "end_date", "venue", "organizer", "capacity", "registered", "status"]);
    if (!isDate(record.date) || !isDate(record.end_date)) throw new HttpError(400, "date and end_date must be valid YYYY-MM-DD dates");
    if (record.end_date < record.date) throw new HttpError(400, "end_date cannot be before date");
    if (record.date === record.end_date) validWindow(record.start_time, record.end_time, "Event time");
    else if (!isTime(record.start_time) || !isTime(record.end_time)) throw new HttpError(400, "Event times must use HH:MM format");
    enumValue(record, "status", EVENT_STATUSES);
    record.capacity = Number(record.capacity);
    record.registered = Number(record.registered);
    if (!Number.isInteger(record.capacity) || record.capacity < 1) throw new HttpError(400, "capacity must be a positive integer");
    if (!Number.isInteger(record.registered) || record.registered < 0 || record.registered > record.capacity) throw new HttpError(400, "registered must be between 0 and capacity");
    if (!Array.isArray(record.registrations)) record.registrations = [];
    for (const registration of record.registrations) {
      required(registration, ["student_id", "name"]);
      if (Object.keys(registration).some((key) => !["student_id", "name"].includes(key)) || typeof registration.student_id !== "string" || typeof registration.name !== "string") throw new HttpError(400, "Each registration must contain only string student_id and name fields");
    }
    const ids = record.registrations.map((item) => String(item.student_id).trim());
    if (new Set(ids).size !== ids.length) throw new HttpError(400, "registrations must contain unique student_id values");
    if (record.registered < record.registrations.length) throw new HttpError(400, "registered cannot be less than the registration list length");
  } else if (system === "announcements") {
    required(record, ["title", "body", "date", "priority", "posted_by", "expires"]);
    if (!isDate(record.date) || !isDate(record.expires)) throw new HttpError(400, "date and expires must be valid YYYY-MM-DD dates");
    if (record.expires < record.date) throw new HttpError(400, "expires cannot be before date");
    enumValue(record, "priority", PRIORITIES);
  } else if (system === "assignments") {
    required(record, ["course", "course_title", "title", "description", "assigned_date", "deadline", "submission_platform", "status", "marks"]);
    if (!isDate(record.assigned_date) || !isDate(record.deadline)) throw new HttpError(400, "assigned_date and deadline must be valid YYYY-MM-DD dates");
    if (record.deadline < record.assigned_date) throw new HttpError(400, "deadline cannot be before assigned_date");
    enumValue(record, "status", ASSIGNMENT_STATUSES);
    record.marks = Number(record.marks);
    if (!Number.isFinite(record.marks) || record.marks < 0) throw new HttpError(400, "marks must be zero or greater");
  }
  return record;
}

function createStore({ dbPath = path.join(__dirname, "..", "campus.db"), dataDir = path.join(__dirname, "..", "data") } = {}) {
  const db = new Database(dbPath);
  db.pragma("journal_mode = DELETE");
  db.exec(`CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, system TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS records_system_idx ON records(system); CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  const insertSeed = db.prepare("INSERT OR IGNORE INTO records (id, system, data, updated_at) VALUES (?, ?, ?, ?)");
  const seed = db.transaction(() => {
    if (db.prepare("SELECT 1 FROM app_meta WHERE key = 'initial_seed_complete'").get()) return false;
    const existingCount = db.prepare("SELECT COUNT(*) AS count FROM records").get().count;
    if (existingCount > 0) {
      db.prepare("INSERT INTO app_meta (key, value) VALUES ('initial_seed_complete', ?)").run(new Date().toISOString());
      return false;
    }
    for (const system of SYSTEMS) {
      const file = path.join(dataDir, `${system}.json`);
      if (!fs.existsSync(file)) continue;
      for (const record of JSON.parse(fs.readFileSync(file, "utf8"))) insertSeed.run(record.id, system, JSON.stringify(record), new Date().toISOString());
    }
    db.prepare("INSERT INTO app_meta (key, value) VALUES ('initial_seed_complete', ?)").run(new Date().toISOString());
    return true;
  });
  const initialSeedInserted = seed();

  const list = (system) => db.prepare("SELECT data FROM records WHERE system = ? ORDER BY id").all(system).map((row) => JSON.parse(row.data));
  const get = (system, id) => {
    const row = db.prepare("SELECT data FROM records WHERE system = ? AND id = ?").get(system, id);
    return row ? JSON.parse(row.data) : null;
  };
  const persist = (system, record) => {
    db.prepare("UPDATE records SET data = ?, updated_at = ? WHERE system = ? AND id = ?").run(JSON.stringify(record), new Date().toISOString(), system, record.id);
    return record;
  };
  const create = (system, input) => {
    const record = validate(system, input);
    if (db.prepare("SELECT 1 FROM records WHERE id = ?").get(record.id)) throw new HttpError(409, `Record id ${record.id} already exists`);
    if (system === "rooms" && list("rooms").some((room) => room.room_number.toLowerCase() === record.room_number.toLowerCase())) throw new HttpError(409, `Room ${record.room_number} already exists`);
    db.prepare("INSERT INTO records (id, system, data, updated_at) VALUES (?, ?, ?, ?)").run(record.id, system, JSON.stringify(record), new Date().toISOString());
    return record;
  };
  const update = (system, id, patch) => {
    const old = get(system, id);
    if (!old) throw new HttpError(404, "Record not found");
    const record = validate(system, { ...old, ...patch, id });
    if (system === "rooms" && list("rooms").some((room) => room.id !== id && room.room_number.toLowerCase() === record.room_number.toLowerCase())) throw new HttpError(409, `Room ${record.room_number} already exists`);
    return persist(system, record);
  };
  const remove = (system, id) => {
    const result = db.prepare("DELETE FROM records WHERE system = ? AND id = ?").run(system, id);
    if (!result.changes) throw new HttpError(404, "Record not found");
  };
  const findRoom = (value) => {
    const needle = String(value || "").toLowerCase();
    return list("rooms").find((room) => room.id.toLowerCase() === needle || room.room_number.toLowerCase() === needle) || null;
  };
  const availability = (room, date, start, end) => {
    validWindow(start, end, "Booking time");
    const conflict = (room.bookings || []).find((booking) => booking.date === date && overlaps(start, end, booking.start_time, booking.end_time));
    return { available: room.status === "available" && !conflict, conflict: conflict || null, reason: room.status !== "available" ? "Room is marked unavailable" : conflict ? `Conflicts with ${conflict.booked_by} (${conflict.start_time}-${conflict.end_time})` : null };
  };
  const bookRoom = (roomRef, input) => {
    const room = findRoom(roomRef);
    if (!room) throw new HttpError(404, "Room not found");
    const booking = { booking_id: String(input.booking_id || `bk-${crypto.randomUUID().slice(0, 8)}`), booked_by: String(input.booked_by || "").trim(), date: input.date, start_time: input.start_time, end_time: input.end_time, purpose: String(input.purpose || "").trim() };
    validateBooking(booking);
    const timeZone = process.env.CAMPUS_TIMEZONE || "Asia/Dhaka";
    const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const dateMap = Object.fromEntries(dateParts.map((part) => [part.type, part.value]));
    if (booking.date < `${dateMap.year}-${dateMap.month}-${dateMap.day}`) throw new HttpError(400, "Booking date cannot be in the past");
    if ((room.bookings || []).some((item) => item.booking_id === booking.booking_id)) throw new HttpError(409, "Booking id already exists");
    const check = availability(room, booking.date, booking.start_time, booking.end_time);
    if (!check.available) throw new HttpError(409, `Room booking conflict: ${check.reason}`);
    room.bookings = [...(room.bookings || []), booking];
    persist("rooms", room);
    return { success: true, room: room.room_number, booking };
  };
  const cancelBooking = (roomRef, bookingId) => {
    const room = findRoom(roomRef);
    if (!room) throw new HttpError(404, "Room not found");
    const before = (room.bookings || []).length;
    room.bookings = (room.bookings || []).filter((booking) => booking.booking_id !== bookingId);
    if (before === room.bookings.length) throw new HttpError(404, "Booking not found");
    persist("rooms", room);
    return { success: true, room: room.room_number, cancelled_booking_id: bookingId };
  };
  const register = (eventId, input) => db.transaction(() => {
    const event = get("events", eventId);
    if (!event) throw new HttpError(404, "Event not found");
    required(input, ["student_id", "name"]);
    if (["cancelled", "completed"].includes(event.status)) throw new HttpError(409, `Registration is closed because the event is ${event.status}`);
    const timeZone = process.env.CAMPUS_TIMEZONE || "Asia/Dhaka";
    const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const dateMap = Object.fromEntries(dateParts.map((part) => [part.type, part.value]));
    if (event.end_date < `${dateMap.year}-${dateMap.month}-${dateMap.day}`) throw new HttpError(409, "Registration is closed because the event has ended");
    if (event.registered >= event.capacity || event.status === "full") throw new HttpError(409, "Event is full");
    if ((event.registrations || []).some((item) => item.student_id === input.student_id)) throw new HttpError(409, "Student is already registered for this event");
    const registration = { student_id: String(input.student_id).trim(), name: String(input.name).trim() };
    event.registrations = [...(event.registrations || []), registration];
    event.registered += 1;
    if (event.registered >= event.capacity) event.status = "full";
    persist("events", event);
    return { success: true, event: event.name, registered: event.registered, registration };
  })();
  const cancelRegistration = (eventId, studentId) => db.transaction(() => {
    const event = get("events", eventId);
    if (!event) throw new HttpError(404, "Event not found");
    const before = (event.registrations || []).length;
    event.registrations = (event.registrations || []).filter((item) => item.student_id !== studentId);
    if (before === event.registrations.length) throw new HttpError(404, "Registration not found");
    event.registered = Math.max(0, event.registered - 1);
    if (event.status === "full") event.status = "upcoming";
    persist("events", event);
    return { success: true, event: event.name, registered: event.registered, cancelled_student_id: studentId };
  })();

  return { db, list, get, create, update, remove, findRoom, availability, bookRoom, cancelBooking, register, cancelRegistration, seed, initialSeedInserted };
}

module.exports = { SYSTEMS, HttpError, createStore, isDate, isTime, minutes };
