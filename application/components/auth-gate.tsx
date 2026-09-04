'use client';

import { useEffect, useState, type SyntheticEvent } from 'react';
import { ArrowRight, LoaderCircle, LockKeyhole, Sparkles } from 'lucide-react';
import { CampusApp } from '@/components/campus-app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AuthUser } from '@/lib/auth';

type Mode = 'login' | 'register';

export function AuthGate({ initialProfile = false }: { initialProfile?: boolean }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>('login');
  const [values, setValues] = useState<Record<string, string>>({ department: 'CSE' });
  const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);

  useEffect(() => { void fetch('/api/auth/session', { cache: 'no-store' }).then(async (response) => response.ok ? response.json() as Promise<{ user: AuthUser | null }> : { user: null }).then((payload) => setUser(payload.user)).catch(() => setUser(null)); }, []);

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const payload = await response.json() as { user?: AuthUser; error?: string };
      if (!response.ok || !payload.user) throw new Error(payload.error || 'Unable to continue.');
      setUser(payload.user);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to continue.'); }
    finally { setSubmitting(false); }
  };

  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); setUser(null); setMode('login'); setValues({ department: 'CSE' }); };

  if (user === undefined) return <main className="grid min-h-screen place-items-center bg-background"><LoaderCircle className="size-7 animate-spin text-[#335786]" /></main>;
  if (user) return <CampusApp user={user} onLogout={logout} onUserUpdate={setUser} initialView={initialProfile ? 'profile' : 'overview'} />;

  const register = mode === 'register';
  const set = (field: string, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const invalidAustEmail = Boolean(values.email) && !/^[^\s@]+@aust\.edu$/i.test(values.email.trim());
  return <main className="grid min-h-screen bg-[#101b33] p-4 lg:grid-cols-[1.05fr_.95fr] lg:p-0">
    <section className="hidden flex-col justify-between bg-[radial-gradient(circle_at_18%_18%,#355b91_0,transparent_30%),linear-gradient(145deg,#101b33,#172b4d)] p-12 text-white lg:flex">
      <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-[15px] bg-[#f4ba42] text-[#101b33]"><Sparkles className="size-5" /></div><div><p className="font-heading text-xl font-bold">CampusOS</p><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/45">AUST · CSE</p></div></div>
      <div className="max-w-lg"><p className="mb-4 text-xs font-bold uppercase tracking-[.16em] text-[#f4ba42]">Your campus, in sync</p><h1 className="font-heading text-5xl font-bold leading-[1.04] tracking-[-.055em]">A live campus workspace built around you.</h1><p className="mt-6 max-w-md text-base leading-7 text-white/58">Sign in to see live schedules, assignments, room availability, campus events, and an AI assistant that works from current data.</p></div>
      <p className="text-xs text-white/35">Secure student access · Persistent session · Live D1 data</p>
    </section>
    <section className="flex items-center justify-center bg-background px-5 py-10 sm:px-10"><div className="w-full max-w-md">
      <div className="mb-9 flex items-center gap-3 lg:hidden"><div className="grid size-10 place-items-center rounded-xl bg-[#f4ba42] text-[#101b33]"><Sparkles className="size-5" /></div><p className="font-heading text-xl font-bold">CampusOS</p></div>
      <p className="text-xs font-bold uppercase tracking-[.16em] text-[#a06a00]">Student access</p><h2 className="mt-2 font-heading text-3xl font-bold tracking-[-.05em]">{register ? 'Create your account' : 'Welcome back'}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{register ? 'Use your university details to create a secure student account.' : 'Sign in to continue to your personalized campus workspace.'}</p>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        {register && <><Field label="Full name" value={values.fullName || ''} onChange={(value) => set('fullName', value)} autoComplete="name" /><Field label="Student ID" value={values.studentId || ''} onChange={(value) => set('studentId', value)} autoComplete="username" /><div className="grid gap-4 sm:grid-cols-2"><Field label="Department" value={values.department || ''} onChange={(value) => set('department', value)} /><Field label="Semester" value={values.semester || ''} onChange={(value) => set('semester', value)} placeholder="e.g. 8th" /></div></>}
        <Field label="AUST student email" type="email" value={values.email || ''} onChange={(value) => set('email', value)} autoComplete="email" placeholder="student@aust.edu" />
        {invalidAustEmail && <p className="-mt-2 text-xs font-medium text-red-700">Please use your AUST student email (@aust.edu).</p>}
        <Field label="Password" type="password" value={values.password || ''} onChange={(value) => set('password', value)} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'At least 8 characters' : ''} />
        {error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
        <Button className="mt-2 h-11 w-full rounded-xl" type="submit" disabled={submitting || invalidAustEmail}>{submitting ? <LoaderCircle className="animate-spin" /> : <>{register ? 'Create account' : 'Sign in'}<ArrowRight /></>}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">{register ? 'Already have an account?' : 'New to CampusOS?'} <button className="font-bold text-[#335786] hover:underline" onClick={() => { setMode(register ? 'login' : 'register'); setError(''); }}>{register ? 'Sign in' : 'Create an account'}</button></p>
      <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" /> Passwords are stored as salted PBKDF2 hashes.</p>
    </div></section>
  </main>;
}

function Field({ label, value, onChange, type = 'text', placeholder, autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; autoComplete?: string }) {
  return <label className="block space-y-1.5 text-xs font-bold"><span>{label}</span><Input required type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl" /></label>;
}
