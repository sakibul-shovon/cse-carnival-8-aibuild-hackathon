import { NextRequest, NextResponse } from "next/server";
import {
  getRegistrationsByEvent,
  registerForEvent,
} from "@/services/event_registrations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await getRegistrationsByEvent(id);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { student_id?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Backend owns all registration rules (capacity/full, cancelled, completed, duplicates).
  const { data, error } = await registerForEvent({
    event_id: id,
    student_id: body.student_id as string,
    name: body.name as string,
  });
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
