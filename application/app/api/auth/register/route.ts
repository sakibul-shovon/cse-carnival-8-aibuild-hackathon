import { NextResponse } from 'next/server';
import { createSession, registerUser, sessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await registerUser(await request.json() as Record<string, unknown>);
    const session = await createSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    response.headers.set('Set-Cookie', sessionCookie(session.id, session.expiresAt, new URL(request.url).protocol === 'https:'));
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create account.' }, { status: 400 }); }
}
