import { NextRequest, NextResponse } from "next/server";
import { getRooms, createRoom } from "@/services/rooms";

export async function GET() {
  const { data, error } = await getRooms();
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

  const { data, error } = await createRoom(body as never);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
