import { NextRequest, NextResponse } from "next/server";
import { cancelRegistration } from "@/services/event_registrations";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  const { id, studentId } = await params;
  const { error } = await cancelRegistration({
    event_id: id,
    student_id: decodeURIComponent(studentId),
  });
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  return NextResponse.json({ data: null });
}
