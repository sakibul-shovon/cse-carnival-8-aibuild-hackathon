'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import {
  Bell, Bot, Building2, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, Edit3, FileCheck2,
  LayoutDashboard, LoaderCircle, MapPin, Menu, MessageSquareText, Plus, RefreshCw, Search, Send,
  LogOut, Sparkles, Trash2, UserRound, Users, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { FIELDS, SYSTEMS, singular, type CampusData, type CampusRecord, type SystemName } from '@/lib/campus-types';
import type { AuthUser } from '@/lib/auth';
import { OverviewCommandCenter } from '@/components/dashboard/overview-command-center';

type ViewName = 'overview' | 'profile' | SystemName;
type ChatMessage = { role: 'user' | 'assistant'; text: string; trace?: { tool: string; label: string }[] };
const emptyData: CampusData = { schedules: [], rooms: [], events: [], announcements: [], assignments: [] };

const navItems: { id: ViewName; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'schedules', label: 'Schedule', icon: CalendarDays },
  { id: 'rooms', label: 'Rooms', icon: Building2 }, { id: 'events', label: 'Events', icon: Sparkles },
  { id: 'announcements', label: 'Notices', icon: Bell }, { id: 'assignments', label: 'Assignments', icon: FileCheck2 },
  { id: 'profile', label: 'My profile', icon: UserRound },
];

const systemMeta: Record<SystemName, { title: string; description: string; columns: { key: string; label: string }[] }> = {
  schedules: { title: 'Class schedule', description: 'Live timetable across the university week.', columns: [{ key: 'course', label: 'Course' }, { key: 'day', label: 'Day' }, { key: 'time', label: 'Time' }, { key: 'room', label: 'Room' }, { key: 'instructor', label: 'Instructor' }] },
  rooms: { title: 'Rooms & spaces', description: 'Availability, equipment, and bookings.', columns: [{ key: 'room_number', label: 'Room' }, { key: 'type', label: 'Type' }, { key: 'capacity', label: 'Capacity' }, { key: 'equipment', label: 'Equipment' }, { key: 'bookings', label: 'Bookings' }] },
  events: { title: 'Campus events', description: 'What’s happening around campus.', columns: [{ key: 'name', label: 'Event' }, { key: 'date', label: 'Date' }, { key: 'time', label: 'Time' }, { key: 'venue', label: 'Venue' }, { key: 'registered', label: 'Attendance' }] },
  announcements: { title: 'Announcement board', description: 'The latest official campus updates.', columns: [{ key: 'title', label: 'Announcement' }, { key: 'priority', label: 'Priority' }, { key: 'date', label: 'Posted' }, { key: 'posted_by', label: 'Posted by' }, { key: 'expires', label: 'Expires' }] },
  assignments: { title: 'Assignment tracker', description: 'Deadlines, progress, and submission details.', columns: [{ key: 'course', label: 'Course' }, { key: 'title', label: 'Assignment' }, { key: 'deadline', label: 'Deadline' }, { key: 'status', label: 'Status' }, { key: 'marks', label: 'Marks' }] },
};

const quickPrompts = ['When is my next class?', 'What is due this week?', 'Find a projector room for 5', 'Show high priority notices'];
const pad = (value: number) => String(value).padStart(2, '0');
const localDate = (offset = 0) => { const date = new Date(); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; };
const formatDate = (value: unknown) => { if (!value || typeof value !== 'string') return '—'; return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`)); };
const formatTime = (value: unknown) => { if (typeof value !== 'string') return '—'; const [hour, minute] = value.split(':').map(Number); return `${hour % 12 || 12}:${pad(minute || 0)} ${hour >= 12 ? 'PM' : 'AM'}`; };
const titleCase = (value: unknown) => { if (typeof value !== 'string') return ''; return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); };
const priorityClass = (value: unknown) => value === 'high' || value === 'late' || value === 'cancelled' ? 'bg-red-50 text-red-700 ring-red-600/15' : value === 'medium' || value === 'pending' || value === 'full' ? 'bg-amber-50 text-amber-800 ring-amber-600/15' : 'bg-emerald-50 text-emerald-700 ring-emerald-600/15';

export function CampusApp({ user, onLogout, onUserUpdate, initialView = 'overview' }: { user: AuthUser; onLogout: () => Promise<void>; onUserUpdate: (user: AuthUser) => void; initialView?: 'overview' | 'profile' }) {
  const [view, setView] = useState<ViewName>(initialView); const [data, setData] = useState<CampusData>(emptyData);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [search, setSearch] = useState('');
  const [mobileNav, setMobileNav] = useState(false); const [editor, setEditor] = useState<{ system: SystemName; record?: CampusRecord } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ system: SystemName; record: CampusRecord } | null>(null);
  const [bookingTarget, setBookingTarget] = useState<CampusRecord | null>(null); const [notice, setNotice] = useState('');
  const [externalPrompt, setExternalPrompt] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await fetch('/api/records', { cache: 'no-store' }); const payload = (await response.json()) as CampusData & { error?: string }; if (!response.ok) throw new Error(payload.error || 'Unable to load data'); setData(payload); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load campus data.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  const setActiveView = (next: ViewName) => { setView(next); setSearch(''); setMobileNav(false); };
  const save = async (system: SystemName, record: Record<string, unknown>, editing: boolean) => {
    const response = await fetch('/api/records', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system, record }) });
    const payload = (await response.json()) as { error?: string }; if (!response.ok) throw new Error(payload.error || 'Unable to save record');
    setEditor(null); setNotice(`${singular[system]} ${editing ? 'updated' : 'added'} successfully.`); await loadData();
  };
  const remove = async () => {
    if (!deleteTarget) return; const { system, record } = deleteTarget;
    const response = await fetch(`/api/records?system=${system}&id=${encodeURIComponent(record.id)}`, { method: 'DELETE' });
    if (!response.ok) { const payload = (await response.json()) as { error?: string }; throw new Error(payload.error || 'Unable to delete'); }
    setDeleteTarget(null); setNotice(`${singular[system]} deleted.`); await loadData();
  };
  const runAction = async (action: string, args: Record<string, unknown>, success: string) => {
    const response = await fetch('/api/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) }); const payload = (await response.json()) as { ok?: boolean; error?: string; already_registered?: boolean };
    if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Action failed'); setNotice(payload.already_registered ? 'You are already registered.' : success); await loadData(); return payload;
  };

  const currentSystem = SYSTEMS.includes(view as SystemName) ? view as SystemName : null;
  const filtered = useMemo(() => currentSystem ? data[currentSystem].filter((record) => JSON.stringify(record).toLowerCase().includes(search.toLowerCase())) : [], [currentSystem, data, search]);

  const handleAskAI = (prompt: string) => {
    setExternalPrompt(prompt);
    const agentEl = document.getElementById('agent-panel');
    agentEl?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Sidebar view={view} setView={setActiveView} open={mobileNav} close={() => setMobileNav(false)} />
      <section className="min-h-screen lg:pl-[246px]">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border/80 bg-background/92 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3"><Button className="lg:hidden" variant="outline" size="icon" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></Button><div><p className="hidden text-xs font-medium text-muted-foreground sm:block">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</p><h1 className="font-heading text-lg font-bold tracking-[-.035em] md:text-2xl">{view === 'overview' ? `Command Center` : view === 'profile' ? 'My profile' : systemMeta[view].title}</h1></div></div>
          <div className="flex items-center gap-2"><button className="hidden h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground shadow-sm md:flex" onClick={() => currentSystem && document.getElementById('data-search')?.focus()}><Search className="size-4"/>Search campus</button><button className="grid size-10 place-items-center rounded-xl border border-border bg-card shadow-sm" aria-label="Notifications" onClick={() => setActiveView('announcements')}><Bell className="size-4"/></button><div className="group relative"><button className="ml-1 grid size-10 place-items-center rounded-xl bg-[#243b67] text-xs font-bold text-white" aria-label="Open account menu">{user.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</button><div className="invisible absolute right-0 top-12 w-56 rounded-xl border border-border bg-card p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"><p className="px-2 py-1 text-sm font-bold">{user.fullName}</p><p className="px-2 pb-2 text-xs text-muted-foreground">{user.studentId} · {user.department}</p><button onClick={() => setActiveView('overview')} className="block w-full text-left rounded-lg px-2 py-2 text-sm font-semibold hover:bg-muted">Dashboard</button><button onClick={() => setActiveView('profile')} className="block w-full text-left rounded-lg px-2 py-2 text-sm font-semibold hover:bg-muted">Profile</button><button onClick={() => void onLogout()} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><LogOut className="size-4" />Log out</button></div></div></div>
        </header>
        {notice && <div className="fixed right-5 top-24 z-50 flex items-center gap-2 rounded-xl bg-[#14223e] px-4 py-3 text-sm font-semibold text-white shadow-2xl"><Check className="size-4 text-[#f4ba42]" />{notice}</div>}

        <div className="mx-auto max-w-[1560px] p-4 md:p-7">
          {error ? <ErrorState message={error} retry={loadData} /> : loading ? <LoadingState /> : (
            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="min-w-0">
                {view === 'overview' ? (
                  <OverviewCommandCenter
                    user={user}
                    data={data}
                    setView={setActiveView}
                    runAction={runAction}
                    onAskAI={handleAskAI}
                    onPostAnnouncement={() => setEditor({ system: 'announcements' })}
                    onBookRoom={setBookingTarget}
                  />
                ) : view === 'profile' ? (
                  <StudentProfile user={user} onUserUpdate={onUserUpdate} />
                ) : (
                  <DataManager user={user} system={view} records={filtered} search={search} setSearch={setSearch} add={() => setEditor({ system: view })} edit={(record) => setEditor({ system: view, record })} remove={(record) => setDeleteTarget({ system: view, record })} book={setBookingTarget} action={runAction} />
                )}
              </div>
              <AgentPanel
                user={user}
                onMutation={loadData}
                externalPrompt={externalPrompt}
                onClearExternalPrompt={() => setExternalPrompt('')}
              />
            </div>
          )}
        </div>
      </section>
      {editor && <RecordEditor system={editor.system} record={editor.record} onClose={() => setEditor(null)} onSave={save} />}
      {deleteTarget && <ConfirmDelete target={deleteTarget} close={() => setDeleteTarget(null)} confirm={() => void remove().catch((e) => setNotice(e.message))} />}
      {bookingTarget && <BookingDialog room={bookingTarget} bookedBy={user.fullName} close={() => setBookingTarget(null)} confirm={async (args) => { await runAction('book_room', args, `Room ${String(bookingTarget.room_number ?? '')} booked.`); setBookingTarget(null); }} />}
    </main>
  );
}

function Sidebar({ view, setView, open, close }: { view: ViewName; setView: (view: ViewName) => void; open: boolean; close: () => void }) {
  return <><div className={`fixed inset-0 z-40 bg-[#0c1426]/50 backdrop-blur-sm lg:hidden ${open ? 'block' : 'hidden'}`} onClick={close} />
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[246px] flex-col border-r border-white/8 bg-[#101b33] text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-20 items-center gap-3 border-b border-white/8 px-7"><div className="grid size-10 place-items-center rounded-[14px] bg-[#f4ba42] text-[#101b33] shadow-[0_8px_30px_rgba(244,186,66,.22)]"><Sparkles className="size-5" strokeWidth={2.4}/></div><div><p className="font-heading text-[17px] font-bold tracking-[-.03em]">CampusOS</p><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/42">AUST · CSE</p></div><button className="ml-auto lg:hidden" onClick={close} aria-label="Close navigation"><X className="size-5"/></button></div>
      <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation"><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-white/32">Workspace</p>{navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${view === id ? 'bg-white/10 text-white' : 'text-white/52 hover:bg-white/6 hover:text-white'}`}><Icon className={`size-[17px] ${view === id ? 'text-[#f4ba42]' : ''}`}/>{label}{view === id && <span className="ml-auto size-1.5 rounded-full bg-[#f4ba42]"/>}</button>)}</nav>
      <div className="m-4 rounded-2xl border border-white/9 bg-white/5 p-4"><div className="mb-3 flex items-center gap-2 text-[#f4ba42]"><Bot className="size-4"/><span className="text-xs font-semibold">Agent online</span></div><p className="text-xs leading-5 text-white/45">Reading the latest campus data in real time.</p></div>
    </aside></>;
}

function StudentProfile({ user, onUserUpdate }: { user: AuthUser; onUserUpdate: (user: AuthUser) => void }) {
  const [fullName, setFullName] = useState(user.fullName); const [department, setDepartment] = useState(user.department); const [semester, setSemester] = useState(user.semester);
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState(''); const initials = user.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const saveProfile = async (event: SyntheticEvent) => {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName, department, semester }) });
      const payload = await response.json() as { user?: AuthUser; error?: string };
      if (!response.ok || !payload.user) throw new Error(payload.error || 'Unable to update profile.');
      onUserUpdate(payload.user); setMessage('Profile saved successfully.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update profile.'); }
    finally { setSaving(false); }
  };
  return <section className="mx-auto max-w-3xl space-y-5"><div className="rounded-[22px] border border-border bg-[linear-gradient(135deg,#172b4d,#315987)] p-6 text-white shadow-[0_12px_40px_rgba(23,37,65,.14)] md:p-8"><div className="flex flex-wrap items-center gap-5"><div className="grid size-20 place-items-center rounded-2xl bg-[#f4ba42] text-xl font-bold text-[#14223e]">{initials}</div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#f4ba42]">AUST student profile</p><h2 className="mt-1 font-heading text-3xl font-bold tracking-[-.045em]">{user.fullName}</h2><p className="mt-1 text-sm text-white/65">{user.department} · {user.semester} semester · {user.studentId}</p></div></div></div><form onSubmit={saveProfile} className="rounded-[22px] border border-border bg-card p-5 shadow-[0_12px_40px_rgba(23,37,65,.055)] md:p-7"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#a06a00]">Account details</p><h2 className="mt-1 font-heading text-2xl font-bold tracking-[-.04em]">Your student information</h2><p className="mt-1 text-sm text-muted-foreground">Update the personal academic details attached to this account.</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-bold sm:col-span-2"><span>Full name</span><Input className="h-11" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label><label className="space-y-1.5 text-xs font-bold"><span>AUST email</span><Input className="h-11 bg-muted" value={user.email} disabled /></label><label className="space-y-1.5 text-xs font-bold"><span>Student ID</span><Input className="h-11 bg-muted" value={user.studentId} disabled /></label><label className="space-y-1.5 text-xs font-bold"><span>Department</span><Input className="h-11" value={department} onChange={(event) => setDepartment(event.target.value)} required /></label><label className="space-y-1.5 text-xs font-bold"><span>Semester</span><Input className="h-11" value={semester} onChange={(event) => setSemester(event.target.value)} required /></label></div><div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className={`text-sm ${message.includes('success') ? 'text-emerald-700' : 'text-red-700'}`}>{message}</p><Button type="submit" className="rounded-xl" disabled={saving}>{saving && <LoaderCircle className="animate-spin" />}Save profile</Button></div></form></section>;
}

function DataManager({ user, system, records, search, setSearch, add, edit, remove, book, action }: { user: AuthUser; system: SystemName; records: CampusRecord[]; search: string; setSearch: (value: string) => void; add: () => void; edit: (record: CampusRecord) => void; remove: (record: CampusRecord) => void; book: (record: CampusRecord) => void; action: (name: string, args: Record<string, unknown>, success: string) => Promise<unknown> }) {
  const meta = systemMeta[system];
  const cell = (record: CampusRecord, key: string) => {
    if (key === 'time') return `${formatTime(record.start_time)}–${formatTime(record.end_time)}`;
    if (key === 'equipment') return <div className="flex max-w-[260px] flex-wrap gap-1">{(record.equipment as string[]).slice(0,4).map((item) => <span key={item} className="rounded-md bg-muted px-1.5 py-1 text-[10px] font-semibold">{item}</span>)}</div>;
    if (key === 'bookings') return `${(record.bookings as unknown[]).length} active`;
    if (key === 'registered') return `${String(record.registered ?? 0)}/${String(record.capacity ?? 0)}`;
    if (key === 'priority' || key === 'status') return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ring-1 ${priorityClass(record[key])}`}>{titleCase(record[key])}</span>;
    if (['date','expires','deadline'].includes(key)) return formatDate(record[key]);
    if (key === 'marks') return `${typeof record[key] === 'number' ? record[key] : Number(record[key] ?? 0)} pts`;
    if (key === 'name' || key === 'title') return <div className="max-w-[320px]"><p className="font-semibold text-foreground">{String(record[key] ?? '')}</p>{key === 'name' && <p className="mt-0.5 truncate text-xs text-muted-foreground">{String(record.organizer ?? '')}</p>}{system === 'announcements' && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{String(record.body ?? '')}</p>}</div>;
    const val = record[key];
    return typeof val === 'string' || typeof val === 'number' ? String(val) : '—';
  };
  const userRegistered = (record: CampusRecord) => (record.registrations as { student_id: string }[])?.some((item) => item.student_id === user.studentId);
  const ownBooking = (record: CampusRecord) => (record.bookings as { booked_by: string }[])?.some((item) => item.booked_by === user.fullName);
  return <section className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_12px_40px_rgba(23,37,65,.055)]"><div className="flex flex-col gap-4 border-b border-border p-5 md:flex-row md:items-end md:justify-between md:p-6"><div><p className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-[#a06a00]">Data manager · {records.length} records</p><h2 className="font-heading text-2xl font-bold tracking-[-.04em]">{meta.title}</h2><p className="mt-1 text-sm text-muted-foreground">{meta.description}</p></div><Button className="h-10 rounded-xl px-4" onClick={add}><Plus/>Add {singular[system].toLowerCase()}</Button></div>
    <div className="flex items-center gap-3 border-b border-border bg-[#fbfaf6] p-4 md:px-6"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input id="data-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${system}…`} className="h-10 bg-white pl-9"/></div><span className="hidden text-xs text-muted-foreground sm:block">Live from database</span><span className="size-2 rounded-full bg-emerald-500"/></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b border-border bg-muted/30">{meta.columns.map((column) => <th key={column.key} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">{column.label}</th>)}<th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Actions</th></tr></thead><tbody>{records.map((record) => <tr key={record.id} className="border-b border-border/70 transition last:border-0 hover:bg-muted/25">{meta.columns.map((column) => <td key={column.key} className="px-5 py-3.5 align-middle text-muted-foreground">{cell(record, column.key)}</td>)}<td className="px-5 py-3.5"><div className="flex items-center justify-end gap-1">{system === 'rooms' && <><Button size="sm" variant="secondary" onClick={() => book(record)}>Book</Button>{ownBooking(record) && <Button size="sm" variant="ghost" onClick={() => void action('cancel_room_booking', { room_number: record.room_number, booking_id: null, booked_by: user.fullName }, 'Room booking cancelled.').catch(() => {})}>Cancel</Button>}</>}{system === 'events' && <Button size="sm" variant={userRegistered(record) ? 'outline' : 'secondary'} onClick={() => void action(userRegistered(record) ? 'cancel_event_registration' : 'register_event', { event_name: record.name, student_id: user.studentId, student_name: user.fullName }, userRegistered(record) ? 'Registration cancelled.' : 'Event registration complete.').catch(() => {})}>{userRegistered(record) ? 'Cancel' : 'Register'}</Button>}<Button size="icon-sm" variant="ghost" onClick={() => edit(record)} aria-label={`Edit ${singular[system]}`}><Edit3/></Button><Button size="icon-sm" variant="ghost" className="text-red-600" onClick={() => remove(record)} aria-label={`Delete ${singular[system]}`}><Trash2/></Button></div></td></tr>)}</tbody></table></div>
    {!records.length && <div className="grid place-items-center px-6 py-20 text-center"><Search className="mb-3 size-8 text-muted-foreground/40"/><p className="font-semibold">No records found</p><p className="mt-1 text-sm text-muted-foreground">Try a different search or add a new record.</p></div>}
  </section>;
}

function AgentPanel({ user, onMutation, externalPrompt, onClearExternalPrompt }: { user: AuthUser; onMutation: () => Promise<void>; externalPrompt?: string; onClearExternalPrompt?: () => void }) {
  const firstName = user.fullName.split(' ')[0] || user.fullName;
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: `Hi ${firstName} — I can check schedules, find and book rooms, track deadlines, or manage event registration. What do you need?` }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim(); if (!text || thinking) return; setInput(''); setMessages((current) => [...current, { role: 'user', text }]); setThinking(true);
    try { const response = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) }); const payload = (await response.json()) as { error?: string; message: string; trace?: { tool: string; label: string }[]; mutated?: boolean }; if (!response.ok) throw new Error(payload.error || 'Agent failed'); setMessages((current) => [...current, { role: 'assistant', text: payload.message, trace: payload.trace }]); if (payload.mutated) await onMutation(); }
    catch (error) { setMessages((current) => [...current, { role: 'assistant', text: error instanceof Error ? error.message : 'I hit a problem. Please try again.' }]); }
    finally { setThinking(false); }
  };

  useEffect(() => {
    if (externalPrompt) {
      void send(externalPrompt);
      onClearExternalPrompt?.();
    }
  }, [externalPrompt]);

  return <aside id="agent-panel" className="sticky top-[108px] flex h-[calc(100vh-136px)] min-h-[590px] flex-col overflow-hidden rounded-[22px] border border-[#293956] bg-[#13213c] text-white shadow-[0_18px_60px_rgba(16,27,51,.18)] 2xl:min-h-0"><div className="flex items-center justify-between border-b border-white/8 px-5 py-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#f4ba42] text-[#13213c]"><Bot className="size-[18px]"/></div><div><p className="text-sm font-bold">Campus agent</p><p className="text-[11px] text-white/42">Live for {user.fullName}</p></div></div><span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#75d6b5]"><span className="size-1.5 rounded-full bg-[#65d0ad]"/>READY</span></div>
    <div className="flex flex-wrap gap-1.5 border-b border-white/8 p-3">{quickPrompts.map((prompt) => <button key={prompt} onClick={() => void send(prompt)} className="rounded-full border border-white/9 bg-white/5 px-2.5 py-1.5 text-[10px] text-white/55 transition hover:bg-white/10 hover:text-white">{prompt}</button>)}</div>
    <div className="flex-1 space-y-4 overflow-y-auto p-5">{messages.map((message, index) => <div key={index} className={`${message.role === 'user' ? 'ml-auto rounded-tr-md bg-[#f4ba42] text-[#17233a]' : 'mr-auto rounded-tl-md bg-white/8 text-white/76'} max-w-[92%] whitespace-pre-line rounded-2xl p-4 text-sm leading-6`}>{message.text}{message.trace && message.trace.length > 0 && <div className={`mt-3 space-y-1 border-t pt-3 text-[10px] ${message.role === 'user' ? 'border-[#17233a]/12 text-[#17233a]/55' : 'border-white/8 text-white/38'}`}>{message.trace.map((item, traceIndex) => <div key={`${item.tool}-${traceIndex}`} className="flex items-center gap-2"><Check className="size-3"/><span className="capitalize">{item.label}</span></div>)}</div>}</div>)}{thinking && <div className="mr-auto flex items-center gap-2 rounded-2xl rounded-tl-md bg-white/8 px-4 py-3 text-xs text-white/50"><LoaderCircle className="size-3.5 animate-spin"/>Checking live data…</div>}<div ref={endRef}/></div>
    <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="border-t border-white/8 p-4"><div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/7 p-2 pl-4"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} rows={1} className="max-h-28 flex-1 resize-none bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/30" placeholder="Ask about campus…"/><button disabled={!input.trim() || thinking} className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f4ba42] text-[#13213c] disabled:opacity-40" aria-label="Send message"><Send className="size-4"/></button></div><p className="mt-2 text-center text-[10px] text-white/25">Actions use verified live data and respect ownership</p></form>
  </aside>;
}

function RecordEditor({ system, record, onClose, onSave }: { system: SystemName; record?: CampusRecord; onClose: () => void; onSave: (system: SystemName, record: Record<string, unknown>, editing: boolean) => Promise<void> }) {
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...(record || {}) })); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (event: SyntheticEvent) => { event.preventDefault(); setSaving(true); setError(''); try { await onSave(system, values, Boolean(record)); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save'); setSaving(false); } };
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[620px]"><DialogHeader><DialogTitle>{record ? 'Edit' : 'Add'} {singular[system].toLowerCase()}</DialogTitle><DialogDescription>Changes become the new truth for both the dashboard and agent.</DialogDescription></DialogHeader><form onSubmit={submit}><div className="grid gap-4 py-2 sm:grid-cols-2">{FIELDS[system].map((field) => <label key={field.key} className={`space-y-1.5 text-xs font-semibold ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}><span>{field.label}</span>{field.type === 'textarea' ? <Textarea required={field.required} value={String(values[field.key] ?? '')} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })} className="min-h-24"/> : field.type === 'select' ? <NativeSelect className="w-full" value={String(values[field.key] ?? field.options?.[0] ?? '')} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}>{field.options?.map((option) => <NativeSelectOption key={option} value={option}>{titleCase(option)}</NativeSelectOption>)}</NativeSelect> : <Input required={field.required} type={field.type === 'tags' ? 'text' : field.type || 'text'} value={field.type === 'tags' && Array.isArray(values[field.key]) ? (values[field.key] as string[]).join(', ') : String(values[field.key] ?? '')} onChange={(e) => setValues({ ...values, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}/>}</label>)}</div>{error && <p className="mt-2 flex items-center gap-2 text-sm text-red-600"><CircleAlert className="size-4"/>{error}</p>}<DialogFooter className="mt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <LoaderCircle className="animate-spin"/>}{record ? 'Save changes' : `Add ${singular[system].toLowerCase()}`}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function ConfirmDelete({ target, close, confirm }: { target: { system: SystemName; record: CampusRecord }; close: () => void; confirm: () => void }) {
  const label = typeof target.record.title === 'string'
    ? target.record.title
    : typeof target.record.name === 'string'
    ? target.record.name
    : typeof target.record.room_number === 'string'
    ? target.record.room_number
    : typeof target.record.course === 'string'
    ? target.record.course
    : target.record.id;
  return <Dialog open onOpenChange={(open) => !open && close()}><DialogContent><DialogHeader><DialogTitle>Delete {singular[target.system].toLowerCase()}?</DialogTitle><DialogDescription>“{label}” will be removed from the live database. The agent will stop using it immediately.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={close}>Keep it</Button><Button variant="destructive" onClick={confirm}><Trash2/>Delete</Button></DialogFooter></DialogContent></Dialog>;
}

function BookingDialog({ room, bookedBy, close, confirm }: { room: CampusRecord; bookedBy: string; close: () => void; confirm: (args: Record<string, unknown>) => Promise<void> }) {
  const [date, setDate] = useState(localDate(1)); const [start, setStart] = useState('15:00'); const [end, setEnd] = useState('17:00'); const [purpose, setPurpose] = useState('Study session'); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  return <Dialog open onOpenChange={(open) => !open && close()}><DialogContent><DialogHeader><DialogTitle>Book Room {String(room.room_number)}</DialogTitle><DialogDescription>{String(room.capacity)} seats · {(room.equipment as string[]).join(', ')}</DialogDescription></DialogHeader><form onSubmit={(event) => { event.preventDefault(); setSaving(true); setError(''); void confirm({ room_number: room.room_number, date, start_time: start, end_time: end, purpose, booked_by: bookedBy }).catch((caught) => { setError(caught.message); setSaving(false); }); }}><div className="grid gap-4 py-2 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-semibold sm:col-span-2">Date<Input type="date" value={date} min={localDate()} onChange={(e) => setDate(e.target.value)} required/></label><label className="space-y-1.5 text-xs font-semibold">Start<Input type="time" value={start} onChange={(e) => setStart(e.target.value)} required/></label><label className="space-y-1.5 text-xs font-semibold">End<Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required/></label><label className="space-y-1.5 text-xs font-semibold sm:col-span-2">Purpose<Input value={purpose} onChange={(e) => setPurpose(e.target.value)} required/></label></div>{error && <p className="mt-2 text-sm text-red-600">{error}</p>}<DialogFooter className="mt-4"><Button variant="outline" type="button" onClick={close}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <LoaderCircle className="animate-spin"/>}Check & book</Button></DialogFooter></form></DialogContent></Dialog>;
}

function LoadingState() { return <div className="grid min-h-[65vh] place-items-center"><div className="text-center"><LoaderCircle className="mx-auto mb-3 size-7 animate-spin text-[#335786]"/><p className="text-sm font-semibold">Syncing campus data…</p></div></div>; }
function ErrorState({ message, retry }: { message: string; retry: () => Promise<void> }) { return <div className="grid min-h-[65vh] place-items-center"><div className="max-w-md rounded-2xl border border-red-100 bg-white p-7 text-center shadow-lg"><CircleAlert className="mx-auto mb-3 size-8 text-red-500"/><h2 className="font-heading text-lg font-bold">Campus data is unavailable</h2><p className="mt-2 text-sm text-muted-foreground">{message}</p><Button className="mt-5" onClick={() => void retry()}><RefreshCw/>Try again</Button></div></div>; }
