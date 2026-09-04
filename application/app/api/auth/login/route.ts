import { NextResponse } from 'next/server';
import { authenticateUser, createSession, sessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: unknown; password?: unknown };
    if (typeof body.email !== 'string' || typeof body.password !== 'string') throw new Error('Email and password are required.');
    const user = await authenticateUser(body.email, body.password); const session = await createSession(user.id);
    const response = NextResponse.json({ user });
    response.headers.set('Set-Cookie', sessionCookie(session.id, session.expiresAt, new URL(request.url).protocol === 'https:'));
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to sign in.' }, { status: 401 }); }
}
