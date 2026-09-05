import { NextRequest, NextResponse } from "next/server";
import { cancelBooking } from "@/services/room_bookings";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await cancelBooking(id);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  return NextResponse.json({ data: null });
}
