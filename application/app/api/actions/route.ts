import { NextResponse } from 'next/server';
import { executeCampusTool } from '@/lib/agent-tools';

const allowed = new Set(['book_room', 'cancel_room_booking', 'register_event', 'cancel_event_registration']);

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; args?: Record<string, unknown> };
    if (!body.action || !allowed.has(body.action)) return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    const result = await executeCampusTool(body.action, body.args || {});
    return NextResponse.json(result, { status: (result as { ok?: boolean }).ok === false ? 409 : 200 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Action failed.' }, { status: 500 }); }
}
