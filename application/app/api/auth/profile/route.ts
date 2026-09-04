import { NextResponse } from 'next/server';
import { getCurrentUser, updateCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  return user ? NextResponse.json({ user }) : NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
}

export async function PUT(request: Request) {
  try { return NextResponse.json({ user: await updateCurrentUser(request, await request.json() as Record<string, unknown>) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update profile.' }, { status: error instanceof Error && error.message === 'Sign in is required.' ? 401 : 400 }); }
}
