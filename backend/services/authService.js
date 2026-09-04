import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDbPool, sql } from '../db.js'

const tokenSecret = () => process.env.AUTH_TOKEN_SECRET ?? 'campusos-development-secret-change-me'
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, student_id: user.student_id, role: user.role })
const authError = (message, statusCode) => { const error = new Error(message); error.statusCode = statusCode; return error }

export async function registerStudent({ name, email, student_id, password }) {
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) throw authError('Name, email, and a password of at least 8 characters are required', 400)
  if (!student_id?.trim()) throw authError('Student ID is required for student registration', 400)
  const pool = await getDbPool()
  const existing = await pool.request().input('email', sql.VarChar(254), email.trim().toLowerCase()).input('student_id', sql.VarChar(50), student_id.trim()).query('SELECT TOP 1 email, student_id FROM dbo.Users WHERE email=@email OR student_id=@student_id')
  if (existing.recordset.length) throw authError(existing.recordset[0].email === email.trim().toLowerCase() ? 'Email already registered' : 'Student ID already registered', 409)
  const id = `usr-${Date.now()}`
  const passwordHash = await bcrypt.hash(password, 12)
  await pool.request().input('id', sql.VarChar(50), id).input('name', sql.NVarChar(150), name.trim()).input('email', sql.VarChar(254), email.trim().toLowerCase()).input('student_id', sql.VarChar(50), student_id.trim()).input('password_hash', sql.VarChar(255), passwordHash).input('role', sql.VarChar(20), 'student').query('INSERT INTO dbo.Users (id,name,email,student_id,password_hash,role) VALUES (@id,@name,@email,@student_id,@password_hash,@role)')
  return createSession({ id, name: name.trim(), email: email.trim().toLowerCase(), student_id: student_id.trim(), role: 'student' })
}

export async function login({ identifier, password, role }) {
  if (!identifier?.trim() || !password || !['student', 'admin'].includes(role)) throw authError('Email or student ID, password, and a valid role are required', 400)
  const request = (await getDbPool()).request().input('identifier', sql.VarChar(254), identifier.trim().toLowerCase())
  const result = await request.query('SELECT TOP 1 id,name,email,student_id,password_hash,role FROM dbo.Users WHERE LOWER(email)=@identifier OR LOWER(ISNULL(student_id, \'\'))=@identifier')
  const user = result.recordset[0]
  if (!user || !(await bcrypt.compare(password, user.password_hash))) throw authError('Invalid email or password', 401)
  if (user.role !== role) throw authError(`This account is not a ${role} account`, 403)
  return createSession(user)
}

export function verifyToken(token) {
  try { return jwt.verify(token, tokenSecret()) } catch { throw authError('Authentication required', 401) }
}

export async function getUserById(id) {
  const result = await (await getDbPool()).request().input('id', sql.VarChar(50), id).query('SELECT TOP 1 id,name,email,student_id,role FROM dbo.Users WHERE id=@id')
  if (!result.recordset[0]) throw authError('User not found', 401)
  return publicUser(result.recordset[0])
}

function createSession(user) { const userData = publicUser(user); return { token: jwt.sign({ sub: userData.id, role: userData.role }, tokenSecret(), { expiresIn: '7d' }), user: userData } }
