import { NextRequest, NextResponse } from "next/server";
import { getBookings, createBooking } from "@/services/room_bookings";

export async function GET() {
  const { data, error } = await getBookings();
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Backend owns all booking validation and conflict detection.
  const { data, error } = await createBooking(body as never);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
