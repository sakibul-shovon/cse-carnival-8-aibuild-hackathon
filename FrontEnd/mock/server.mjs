import { createServer } from 'node:http'
import { readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '..', '..', 'data')
const statePath = join(here, '.state.json')
const resources = ['schedules', 'rooms', 'events', 'announcements', 'assignments']
const prefixes = { schedules: 'sch', rooms: 'room', events: 'evt', announcements: 'ann', assignments: 'asgn' }
const port = Number(process.env.MOCK_PORT || 8000)

const loadSeeds = async () => Object.fromEntries(await Promise.all(
  [...resources, 'users'].map(async (name) => [name, JSON.parse(await readFile(join(dataDir, `${name}.json`), 'utf8'))]),
))

async function loadState(reset = false) {
  if (!reset) {
    try { await access(statePath); return JSON.parse(await readFile(statePath, 'utf8')) } catch { /* seed below */ }
  }
  const seeded = await loadSeeds()
  await writeFile(statePath, JSON.stringify(seeded, null, 2))
  return seeded
}

let state = await loadState(process.argv.includes('--reset'))
if (process.argv.includes('--reset')) {
  console.log('Mock data reset from /data.')
  process.exit(0)
}

const persist = () => writeFile(statePath, JSON.stringify(state, null, 2))
const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' })
  res.end(body === undefined ? '' : JSON.stringify(body))
}
const error = (res, status, code, message, details = {}) => send(res, status, { error: { code, message, details } })
const bodyOf = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}') } catch { return null }
}
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd
const weekday = (iso) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${iso}T00:00:00Z`).getUTCDay()]
const newId = (resource) => `${prefixes[resource]}-${randomUUID().slice(0, 8)}`
const list = (items, url) => {
  const params = url.searchParams
  const filtered = items.filter((item) => [...params].every(([key, value]) => {
    if (key === 'equipment') return item.equipment?.some((entry) => entry.toLowerCase() === value.toLowerCase())
    if (key === 'min_capacity') return item.capacity >= Number(value)
    if (key === 'active_on') return item.date <= value && value <= item.expires
    if (key === 'due_from') return item.deadline >= value
    if (key === 'due_to') return item.deadline <= value
    if (key === 'date_from') return item.end_date >= value
    if (key === 'date_to') return item.date <= value
    return String(item[key] ?? '').toLowerCase().includes(value.toLowerCase())
  }))
  return { items: filtered, total: filtered.length }
}

function validate(resource, candidate) {
  const required = {
    schedules: ['course', 'title', 'day', 'start_time', 'end_time', 'room', 'instructor', 'section'],
    rooms: ['room_number', 'type', 'capacity', 'equipment', 'floor', 'status'],
    events: ['name', 'description', 'date', 'start_time', 'end_time', 'end_date', 'venue', 'organizer', 'capacity', 'status'],
    announcements: ['title', 'body', 'date', 'priority', 'posted_by', 'expires'],
    assignments: ['course', 'course_title', 'title', 'description', 'assigned_date', 'deadline', 'submission_platform', 'status', 'marks'],
  }[resource]
  const missing = required.filter((key) => candidate[key] === undefined || candidate[key] === '')
  if (missing.length) return `Required fields: ${missing.join(', ')}`
  if (candidate.start_time && candidate.end_time && candidate.date === candidate.end_date && candidate.start_time >= candidate.end_time) return 'End time must be later than start time.'
  if (resource === 'schedules' && candidate.start_time >= candidate.end_time) return 'End time must be later than start time.'
  if (resource === 'announcements' && candidate.expires < candidate.date) return 'Expiry cannot precede the publish date.'
  if (resource === 'assignments' && candidate.deadline < candidate.assigned_date) return 'Deadline cannot precede the assigned date.'
  return null
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204)
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (url.pathname === '/health') return send(res, 200, { status: 'ok', service: 'campus-os-mock' })
  if (!url.pathname.startsWith('/api/v1/')) return error(res, 404, 'NOT_FOUND', 'Route not found.')
  const parts = url.pathname.slice(8).split('/').filter(Boolean)

  if (parts[0] === 'users' && parts[1] === 'me') {
    const user = state.users[0]
    if (parts.length === 2) return send(res, 200, user)
    const resource = parts[2]
    let items = state[resource] || []
    if (resource === 'schedules') items = items.filter((x) => user.enrollments.some((e) => e.course === x.course && e.section === x.section))
    if (resource === 'assignments') items = items.filter((x) => user.enrollments.some((e) => e.course === x.course))
    if (resource === 'announcements') { const on = url.searchParams.get('on_date') || new Date().toISOString().slice(0, 10); items = items.filter((x) => x.date <= on && on <= x.expires) }
    if (resource === 'events') { const on = url.searchParams.get('on_date') || new Date().toISOString().slice(0, 10); items = items.filter((x) => x.end_date >= on && !['completed', 'cancelled'].includes(x.status)) }
    return send(res, 200, { items, total: items.length })
  }

  if (parts[0] === 'rooms' && parts[1] === 'availability' && req.method === 'GET') {
    const { searchParams: q } = url
    const date = q.get('date'), start = q.get('start_time'), end = q.get('end_time')
    if (!date || !start || !end || start >= end) return error(res, 400, 'VALIDATION_ERROR', 'A valid date and time range are required.')
    const items = state.rooms.filter((room) => room.status === 'available'
      && room.capacity >= Number(q.get('capacity') || 1)
      && q.getAll('equipment').every((wanted) => room.equipment.some((x) => x.toLowerCase() === wanted.toLowerCase()))
      && !room.bookings.some((b) => b.date === date && overlaps(start, end, b.start_time, b.end_time))
      && !state.schedules.some((s) => s.room === room.room_number && s.day === weekday(date) && overlaps(start, end, s.start_time, s.end_time)))
    return send(res, 200, { items, total: items.length })
  }

  if (parts[0] === 'rooms' && parts[2] === 'bookings') {
    const room = state.rooms.find((x) => x.id === parts[1])
    if (!room) return error(res, 404, 'NOT_FOUND', 'Room not found.')
    if (req.method === 'POST' && parts.length === 3) {
      const input = await bodyOf(req)
      if (!input?.date || !input.start_time || !input.end_time || !input.purpose) return error(res, 422, 'VALIDATION_ERROR', 'Date, start time, end time, and purpose are required.')
      const conflict = room.bookings.some((b) => b.date === input.date && overlaps(input.start_time, input.end_time, b.start_time, b.end_time)) || state.schedules.some((s) => s.room === room.room_number && s.day === weekday(input.date) && overlaps(input.start_time, input.end_time, s.start_time, s.end_time))
      if (conflict) return error(res, 409, 'ROOM_UNAVAILABLE', `${room.room_number} is unavailable during that period.`, { room_id: room.id })
      const booking = { ...input, booked_by: state.users[0].name, booking_id: `bk-${randomUUID().slice(0, 8)}` }
      room.bookings.push(booking); await persist(); return send(res, 201, booking)
    }
    if (req.method === 'DELETE' && parts[3]) {
      const index = room.bookings.findIndex((x) => x.booking_id === parts[3])
      if (index < 0) return error(res, 404, 'NOT_FOUND', 'Booking not found.')
      if (room.bookings[index].booked_by !== state.users[0].name) return error(res, 403, 'FORBIDDEN', 'You can only cancel your own bookings.')
      room.bookings.splice(index, 1); await persist(); return send(res, 200, { id: parts[3], deleted: true })
    }
  }

  if (parts[0] === 'events' && parts[2] === 'registrations') {
    const event = state.events.find((x) => x.id === parts[1]); const user = state.users[0]
    if (!event) return error(res, 404, 'NOT_FOUND', 'Event not found.')
    if (req.method === 'POST') {
      if (event.registrations.some((x) => x.student_id === user.student_id)) return error(res, 409, 'ALREADY_REGISTERED', 'You are already registered.')
      if (event.registered >= event.capacity || event.status === 'full') return error(res, 409, 'EVENT_FULL', 'This event is full.')
      const registration = { student_id: user.student_id, name: user.name }; event.registrations.push(registration); event.registered += 1; await persist(); return send(res, 201, registration)
    }
    if (req.method === 'DELETE' && parts[3] === user.student_id) {
      const index = event.registrations.findIndex((x) => x.student_id === user.student_id)
      if (index < 0) return error(res, 404, 'NOT_FOUND', 'Registration not found.')
      event.registrations.splice(index, 1); event.registered -= 1; await persist(); return send(res, 200, { id: user.student_id, deleted: true })
    }
  }

  if (parts[0] === 'agent' && parts[1] === 'messages' && req.method === 'POST') {
    const input = await bodyOf(req); const message = input?.message?.trim()
    if (!message) return error(res, 422, 'VALIDATION_ERROR', 'Message is required.')
    const lower = message.toLowerCase(); let status = 'completed'; let reply
    if (lower.includes('book') && !/\d{1,2}(:\d{2})?\s*(am|pm)/i.test(message)) { status = 'needs_clarification'; reply = 'What start and end time should I use for the booking?' }
    else if (lower.includes('delete') || lower.includes('change official')) { status = 'refused'; reply = 'I can’t change official campus records with your student account.' }
    else if (lower.includes('assignment') || lower.includes('due')) { const due = state.assignments.filter((x) => x.status === 'pending').slice(0, 3); reply = `Your next pending work: ${due.map((x) => `${x.title} (${x.deadline})`).join('; ')}.` }
    else if (lower.includes('class') || lower.includes('schedule')) { const mine = state.schedules.filter((x) => state.users[0].enrollments.some((e) => e.course === x.course && e.section === x.section)).slice(0, 3); reply = `Upcoming schedule highlights: ${mine.map((x) => `${x.course} on ${x.day} at ${x.start_time}`).join('; ')}.` }
    else reply = 'I can help with schedules, rooms, events, announcements, assignments, and bookings. What would you like to know?'
    return send(res, 200, { conversation_id: input.conversation_id || `conv-${randomUUID().slice(0, 8)}`, reply, status, tool_calls: [] })
  }

  if (resources.includes(parts[0])) {
    const resource = parts[0], collection = state[resource]
    if (req.method === 'GET' && !parts[1]) return send(res, 200, list(collection, url))
    const index = collection.findIndex((x) => x.id === parts[1])
    if (req.method === 'GET') return index < 0 ? error(res, 404, 'NOT_FOUND', 'Resource not found.') : send(res, 200, collection[index])
    if (req.method === 'POST' && !parts[1]) {
      const input = await bodyOf(req); if (!input) return error(res, 400, 'VALIDATION_ERROR', 'Malformed JSON.')
      const created = { ...input, id: newId(resource) }
      if (resource === 'rooms') created.bookings = []
      if (resource === 'events') { created.registered = 0; created.registrations = [] }
      const problem = validate(resource, created); if (problem) return error(res, 422, 'VALIDATION_ERROR', problem)
      if (resource === 'rooms' && collection.some((x) => x.room_number.toLowerCase() === created.room_number.toLowerCase())) return error(res, 409, 'CONFLICT', 'Room number already exists.')
      collection.push(created); await persist(); return send(res, 201, created)
    }
    if (req.method === 'PATCH') {
      if (index < 0) return error(res, 404, 'NOT_FOUND', 'Resource not found.')
      const input = await bodyOf(req); if (!input || !Object.keys(input).length) return error(res, 422, 'VALIDATION_ERROR', 'At least one field is required.')
      const updated = { ...collection[index], ...input, id: collection[index].id }
      const problem = validate(resource, updated); if (problem) return error(res, 422, 'VALIDATION_ERROR', problem)
      collection[index] = updated; await persist(); return send(res, 200, updated)
    }
    if (req.method === 'DELETE') {
      if (index < 0) return error(res, 404, 'NOT_FOUND', 'Resource not found.')
      collection.splice(index, 1); await persist(); return send(res, 200, { id: parts[1], deleted: true })
    }
  }
  return error(res, 404, 'NOT_FOUND', 'Route not found.')
}

createServer((req, res) => handle(req, res).catch((cause) => { console.error(cause); error(res, 500, 'INTERNAL_ERROR', 'The mock server could not complete the request.') })).listen(port, () => {
  console.log(`CampusOS mock API listening on http://localhost:${port}`)
})
