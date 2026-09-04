import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'

const origin = 'http://127.0.0.1:8127'
let server
before(async () => {
  await new Promise((resolve, reject) => {
    const reset = spawn(process.execPath, ['mock/server.mjs', '--reset'], { cwd: new URL('..', import.meta.url), stdio: 'ignore' })
    reset.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`reset exited ${code}`)))
  })
  server = spawn(process.execPath, ['mock/server.mjs'], { cwd: new URL('..', import.meta.url), env: { ...process.env, MOCK_PORT: '8127' }, stdio: ['ignore', 'pipe', 'inherit'] })
  await once(server.stdout, 'data')
})
after(() => server?.kill())
const json = async (path, init) => { const response = await fetch(`${origin}${path}`, init); return { status: response.status, body: await response.json() } }

test('serves seed data and trusted identity', async () => {
  const me = await json('/api/v1/users/me')
  const schedules = await json('/api/v1/schedules')
  assert.equal(me.body.student_id, '20-40532')
  assert.equal(schedules.body.total, 24)
})

test('persists CRUD mutations with contract envelopes', async () => {
  const created = await json('/api/v1/announcements', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Test notice', body: 'Contract test', date: '2026-09-04', priority: 'low', posted_by: 'Test suite', expires: '2026-09-05' }) })
  assert.equal(created.status, 201)
  const updated = await json(`/api/v1/announcements/${created.body.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ priority: 'high' }) })
  assert.equal(updated.body.priority, 'high')
  const removed = await json(`/api/v1/announcements/${created.body.id}`, { method: 'DELETE' })
  assert.deepEqual(removed.body, { id: created.body.id, deleted: true })
})

test('models booking conflicts and agent clarification', async () => {
  const conflict = await json('/api/v1/rooms/room-011/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: '2026-09-05', start_time: '15:00', end_time: '15:30', purpose: 'Collision' }) })
  assert.equal(conflict.status, 409)
  assert.equal(conflict.body.error.code, 'ROOM_UNAVAILABLE')
  const chat = await json('/api/v1/agent/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ conversation_id: null, message: 'Book a room tomorrow', timezone: 'Asia/Dhaka' }) })
  assert.equal(chat.body.status, 'needs_clarification')
})
