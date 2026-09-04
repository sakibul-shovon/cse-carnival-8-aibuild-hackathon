import { NextResponse } from 'next/server';
import { makeId, readCampusData, removeRecord, saveRecord } from '@/lib/campus-db';
import { FIELDS, SYSTEMS, type CampusRecord, type SystemName } from '@/lib/campus-types';

export const dynamic = 'force-dynamic';

function isSystem(value: unknown): value is SystemName { return typeof value === 'string' && SYSTEMS.includes(value as SystemName); }

function cleanRecord(system: SystemName, input: Record<string, unknown>, id?: string): CampusRecord {
  const record: CampusRecord = { id: id || makeId(system) };
  for (const field of FIELDS[system]) {
    const value = input[field.key];
    if (field.required && (value === undefined || value === null || value === '')) throw new Error(`${field.label} is required.`);
    record[field.key] = field.type === 'number' ? Number(value) : field.type === 'tags' ? (Array.isArray(value) ? value : String(value || '').split(',').map((item) => item.trim()).filter(Boolean)) : value;
  }
  if (system === 'rooms') record.bookings = Array.isArray(input.bookings) ? input.bookings : [];
  if (system === 'events') { record.registrations = Array.isArray(input.registrations) ? input.registrations : []; record.registered = Number(input.registered ?? (record.registrations as unknown[]).length); }
  return record;
}

export async function GET() {
  try { return NextResponse.json(await readCampusData()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load campus data.' }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { system?: unknown; record?: Record<string, unknown> };
    if (!isSystem(body.system) || !body.record) return NextResponse.json({ error: 'Invalid system or record.' }, { status: 400 });
    const record = cleanRecord(body.system, body.record); await saveRecord(body.system, record); return NextResponse.json(record, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to add record.' }, { status: 400 }); }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { system?: unknown; record?: Record<string, unknown> };
    if (!isSystem(body.system) || !body.record || typeof body.record.id !== 'string') return NextResponse.json({ error: 'Invalid system or record.' }, { status: 400 });
    const record = cleanRecord(body.system, body.record, body.record.id); await saveRecord(body.system, record); return NextResponse.json(record);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update record.' }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url); const system = url.searchParams.get('system'); const id = url.searchParams.get('id');
  if (!isSystem(system) || !id) return NextResponse.json({ error: 'Invalid system or id.' }, { status: 400 });
  await removeRecord(system, id); return NextResponse.json({ ok: true });
}
