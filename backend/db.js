const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, 'campusos.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('teacher','student','admin'))
);

CREATE TABLE IF NOT EXISTS schedule (
  id TEXT PRIMARY KEY,
  course TEXT,
  title TEXT,
  day TEXT,
  start_time TEXT,
  end_time TEXT,
  room TEXT,
  instructor TEXT,
  section TEXT
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  course TEXT,
  course_title TEXT,
  title TEXT,
  description TEXT,
  assigned_date TEXT,
  deadline TEXT,
  submission_platform TEXT,
  status TEXT,
  marks INTEGER,
  created_by INTEGER,
  FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id TEXT,
  student_id INTEGER,
  status TEXT DEFAULT 'not_submitted' CHECK(status IN ('not_submitted','submitted')),
  submitted_at TEXT,
  FOREIGN KEY(assignment_id) REFERENCES assignments(id),
  FOREIGN KEY(student_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT,
  body TEXT,
  date TEXT,
  priority TEXT,
  posted_by TEXT,
  expires TEXT
);
`);

const DATA_DIR = path.join(__dirname, '..', 'data');

function seedIfEmpty(table, file) {
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
  if (count === 0) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Seed file not found: ${filePath} — skipping ${table}`);
      return;
    }
    const data = JSON.parse(fs.readFileSync(filePath));
    if (!data.length) return;

    const tableCols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    const cols = Object.keys(data[0]).filter(k => tableCols.includes(k));

    if (!cols.length) {
      console.warn(`No matching columns for ${table} — check field names in ${file}`);
      return;
    }

    const stmt = db.prepare(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
    );
    data.forEach(row => stmt.run(...cols.map(c => row[c])));
    console.log(`Seeded ${table} with ${data.length} rows`);
  }
}

seedIfEmpty('schedule', 'schedules.json');
seedIfEmpty('announcements', 'announcements.json');
seedIfEmpty('assignments', 'assignments.json');

if (db.prepare('SELECT COUNT(*) as c FROM users').get().c === 0) {
  const insert = db.prepare('INSERT INTO users (name, role) VALUES (?,?)');
  insert.run('Ms. Rahman', 'teacher');
  insert.run('Sultana', 'student');
  insert.run('Admin Office', 'admin');
  console.log('Seeded demo users');
}

module.exports = db;