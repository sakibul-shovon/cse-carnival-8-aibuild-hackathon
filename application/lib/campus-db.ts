import { env } from 'cloudflare:workers';
import { seedData } from './seed-data';
import { SYSTEMS, type CampusData, type CampusRecord, type SystemName } from './campus-types';

const nowIso = () => new Date().toISOString();

export async function ensureSeeded() {
  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM campus_records').first<{ count: number }>();
  if (Number(count?.count ?? 0) > 0) return;
  const timestamp = nowIso();
  const statements = SYSTEMS.flatMap((system) => seedData[system].map((record) =>
    env.DB.prepare('INSERT OR IGNORE INTO campus_records (id, system, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(record.id, system, JSON.stringify(record), timestamp, timestamp),
  ));
  for (let index = 0; index < statements.length; index += 75) await env.DB.batch(statements.slice(index, index + 75));
}

export async function readCampusData(): Promise<CampusData> {
  await ensureSeeded();
  const rows = await env.DB.prepare('SELECT system, data FROM campus_records ORDER BY created_at ASC').all<{ system: SystemName; data: string }>();
  const result = { schedules: [], rooms: [], events: [], announcements: [], assignments: [] } as CampusData;
  for (const row of rows.results) if (SYSTEMS.includes(row.system)) result[row.system].push(JSON.parse(row.data) as CampusRecord);
  return result;
}

export async function saveRecord(system: SystemName, record: CampusRecord) {
  const existing = await env.DB.prepare('SELECT created_at FROM campus_records WHERE id = ? AND system = ?').bind(record.id, system).first<{ created_at: string }>();
  const timestamp = nowIso();
  await env.DB.prepare(`INSERT INTO campus_records (id, system, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET system = excluded.system, data = excluded.data, updated_at = excluded.updated_at`)
    .bind(record.id, system, JSON.stringify(record), existing?.created_at ?? timestamp, timestamp).run();
  return record;
}

export async function removeRecord(system: SystemName, id: string) {
  return env.DB.prepare('DELETE FROM campus_records WHERE id = ? AND system = ?').bind(id, system).run();
}

export function makeId(system: SystemName) {
  const prefix = { schedules: 'sch', rooms: 'room', events: 'evt', announcements: 'ann', assignments: 'asgn' }[system];
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
