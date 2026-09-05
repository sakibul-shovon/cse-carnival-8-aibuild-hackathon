import { NextRequest, NextResponse } from "next/server";
import { getBookingsByRoom } from "@/services/room_bookings";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await getBookingsByRoom(id);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ data });
}
