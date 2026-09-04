import { env } from 'cloudflare:workers';

const encoder = new TextEncoder();
const SESSION_COOKIE = 'campus_session';
const SESSION_DAYS = 30;

export type AuthUser = {
  id: string;
  fullName: string;
  studentId: string;
  email: string;
  department: string;
  semester: string;
  role: 'student' | 'admin';
};

type UserRow = {
  id: string; full_name: string; student_id: string; email: string;
  department: string; semester: string; role: AuthUser['role'];
};

const authSchema = [
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY NOT NULL, full_name text NOT NULL, student_id text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE, password_hash text NOT NULL, password_salt text NOT NULL,
    department text NOT NULL, semester text NOT NULL,
    role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at text NOT NULL, updated_at text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at text NOT NULL, created_at text NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at)',
];

let schemaReady: Promise<void> | undefined;

export async function ensureAuthSchema() {
  schemaReady ??= env.DB.batch(authSchema.map((statement) => env.DB.prepare(statement))).then(() => undefined);
  try { await schemaReady; } catch (error) { schemaReady = undefined; throw error; }
}

function toUser(row: UserRow): AuthUser {
  return { id: row.id, fullName: row.full_name, studentId: row.student_id, email: row.email, department: row.department, semester: row.semester, role: row.role };
}

export function isAustStudentEmail(value: string) {
  return /^[^\s@]+@aust\.edu$/i.test(value.trim());
}

function getCookie(request: Request, name: string) {
  return request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function toBase64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
function fromBase64(value: string) { return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)); }

async function passwordHash(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 100_000, hash: 'SHA-256' }, key, 256);
  return toBase64(new Uint8Array(bits));
}

function isSameHash(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

export function validateRegistration(input: Record<string, unknown>) {
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const studentId = typeof input.studentId === 'string' ? input.studentId.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const department = typeof input.department === 'string' ? input.department.trim() : '';
  const semester = typeof input.semester === 'string' ? input.semester.trim() : '';
  if (fullName.length < 2) throw new Error('Enter your full name.');
  if (studentId.length < 3) throw new Error('Enter a valid student ID.');
  if (!isAustStudentEmail(email)) throw new Error('Please use your AUST student email (@aust.edu) to access CampusOS.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');
  if (!department) throw new Error('Enter your department.');
  if (!semester) throw new Error('Enter your semester.');
  return { fullName, studentId, email, password, department, semester };
}

export async function registerUser(input: Record<string, unknown>) {
  await ensureAuthSchema();
  const values = validateRegistration(input);
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? OR student_id = ?').bind(values.email, values.studentId).first();
  if (existing) throw new Error('An account already exists with that email or student ID.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const id = crypto.randomUUID(); const timestamp = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO users (id, full_name, student_id, email, password_hash, password_salt, department, semester, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'student', ?, ?)`).bind(id, values.fullName, values.studentId, values.email, await passwordHash(values.password, salt), toBase64(salt), values.department, values.semester, timestamp, timestamp).run();
  return { id, fullName: values.fullName, studentId: values.studentId, email: values.email, department: values.department, semester: values.semester, role: 'student' as const };
}

export async function authenticateUser(email: string, password: string) {
  await ensureAuthSchema();
  if (!isAustStudentEmail(email)) throw new Error('Please use your AUST student email (@aust.edu) to access CampusOS.');
  const row = await env.DB.prepare(`SELECT id, full_name, student_id, email, department, semester, role, password_hash, password_salt
    FROM users WHERE email = ?`).bind(email.trim().toLowerCase()).first<UserRow & { password_hash: string; password_salt: string }>();
  if (!row || !isSameHash(await passwordHash(password, fromBase64(row.password_salt)), row.password_hash)) throw new Error('Invalid email or password.');
  return toUser(row);
}

export async function createSession(userId: string) {
  await ensureAuthSchema();
  const id = crypto.randomUUID(); const createdAt = new Date(); const expiresAt = new Date(createdAt.getTime() + SESSION_DAYS * 86_400_000);
  await env.DB.prepare('INSERT INTO user_sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(id, userId, expiresAt.toISOString(), createdAt.toISOString()).run();
  return { id, expiresAt };
}

export async function getCurrentUser(request: Request) {
  await ensureAuthSchema();
  const sessionId = getCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;
  const row = await env.DB.prepare(`SELECT u.id, u.full_name, u.student_id, u.email, u.department, u.semester, u.role
    FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?`).bind(sessionId, new Date().toISOString()).first<UserRow>();
  return row ? toUser(row) : null;
}

export async function deleteSession(request: Request) {
  const sessionId = getCookie(request, SESSION_COOKIE);
  if (sessionId) await env.DB.prepare('DELETE FROM user_sessions WHERE id = ?').bind(sessionId).run();
}

export async function updateCurrentUser(request: Request, input: Record<string, unknown>) {
  const user = await getCurrentUser(request);
  if (!user) throw new Error('Sign in is required.');
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const department = typeof input.department === 'string' ? input.department.trim() : '';
  const semester = typeof input.semester === 'string' ? input.semester.trim() : '';
  if (fullName.length < 2) throw new Error('Enter your full name.');
  if (!department) throw new Error('Enter your department.');
  if (!semester) throw new Error('Enter your semester.');
  await env.DB.prepare('UPDATE users SET full_name = ?, department = ?, semester = ?, updated_at = ? WHERE id = ?')
    .bind(fullName, department, semester, new Date().toISOString(), user.id).run();
  return { ...user, fullName, department, semester };
}

export function sessionCookie(sessionId: string, expiresAt: Date, secure: boolean) {
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure ? '; Secure' : ''}`;
}

export function expiredSessionCookie(secure: boolean) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}
