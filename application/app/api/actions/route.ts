import { NextResponse } from 'next/server';
import { executeCampusTool } from '@/lib/agent-tools';
import { getCurrentUser } from '@/lib/auth';

const allowed = new Set(['book_room', 'cancel_room_booking', 'register_event', 'cancel_event_registration']);

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
    const body = await request.json() as { action?: string; args?: Record<string, unknown> };
    if (!body.action || !allowed.has(body.action)) return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    const args = { ...(body.args || {}) };
    if (body.action === 'book_room' && !args.booked_by) args.booked_by = user.fullName;
    if (body.action === 'cancel_room_booking' && !args.booked_by) args.booked_by = user.fullName;
    if (body.action === 'register_event') {
      if (!args.student_id) args.student_id = user.studentId;
      if (!args.student_name) args.student_name = user.fullName;
    }
    if (body.action === 'cancel_event_registration') {
      if (!args.student_id) args.student_id = user.studentId;
    }
    const result = await executeCampusTool(body.action, args);
    return NextResponse.json(result, { status: (result as { ok?: boolean }).ok === false ? 409 : 200 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Action failed.' }, { status: 500 }); }
}
