'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import {
  Bell, Bot, Building2, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, Edit3, FileCheck2,
  LayoutDashboard, LoaderCircle, MapPin, Menu, MessageSquareText, Plus, RefreshCw, Search, Send,
  Sparkles, Trash2, Users, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { FIELDS, SYSTEMS, singular, type CampusData, type CampusRecord, type SystemName } from '@/lib/campus-types';

type ViewName = 'overview' | SystemName;
type ChatMessage = { role: 'user' | 'assistant'; text: string; trace?: { tool: string; label: string }[] };
const emptyData: CampusData = { schedules: [], rooms: [], events: [], announcements: [], assignments: [] };

const navItems: { id: ViewName; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'schedules', label: 'Schedule', icon: CalendarDays },
  { id: 'rooms', label: 'Rooms', icon: Building2 }, { id: 'events', label: 'Events', icon: Sparkles },
  { id: 'announcements', label: 'Notices', icon: Bell }, { id: 'assignments', label: 'Assignments', icon: FileCheck2 },
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
const formatDate = (value: unknown) => { if (!value) return '—'; const raw = String(value); return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${raw}T12:00:00`)); };
const formatTime = (value: unknown) => { const [hour, minute] = String(value || '00:00').split(':').map(Number); return `${hour % 12 || 12}:${pad(minute)} ${hour >= 12 ? 'PM' : 'AM'}`; };
const titleCase = (value: unknown) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const priorityClass = (value: unknown) => value === 'high' || value === 'late' || value === 'cancelled' ? 'bg-red-50 text-red-700 ring-red-600/15' : value === 'medium' || value === 'pending' || value === 'full' ? 'bg-amber-50 text-amber-800 ring-amber-600/15' : 'bg-emerald-50 text-emerald-700 ring-emerald-600/15';

export function CampusApp() {
  const [view, setView] = useState<ViewName>('overview'); const [data, setData] = useState<CampusData>(emptyData);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [search, setSearch] = useState('');
  const [mobileNav, setMobileNav] = useState(false); const [editor, setEditor] = useState<{ system: SystemName; record?: CampusRecord } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ system: SystemName; record: CampusRecord } | null>(null);
  const [bookingTarget, setBookingTarget] = useState<CampusRecord | null>(null); const [notice, setNotice] = useState('');

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

  const currentSystem = view === 'overview' ? null : view;
  const filtered = useMemo(() => currentSystem ? data[currentSystem].filter((record) => JSON.stringify(record).toLowerCase().includes(search.toLowerCase())) : [], [currentSystem, data, search]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Sidebar view={view} setView={setActiveView} open={mobileNav} close={() => setMobileNav(false)} />
      <section className="min-h-screen lg:pl-[246px]">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border/80 bg-background/92 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3"><Button className="lg:hidden" variant="outline" size="icon" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></Button><div><p className="hidden text-xs font-medium text-muted-foreground sm:block">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</p><h1 className="font-heading text-lg font-bold tracking-[-.035em] md:text-2xl">{view === 'overview' ? 'Good afternoon, Sakibul' : systemMeta[view].title}</h1></div></div>
          <div className="flex items-center gap-2"><button className="hidden h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground shadow-sm md:flex" onClick={() => currentSystem && document.getElementById('data-search')?.focus()}><Search className="size-4"/>Search campus</button><button className="grid size-10 place-items-center rounded-xl border border-border bg-card shadow-sm" aria-label="Notifications"><Bell className="size-4"/></button><div className="ml-1 grid size-10 place-items-center rounded-xl bg-[#243b67] text-xs font-bold text-white">SH</div></div>
        </header>
        {notice && <div className="fixed right-5 top-24 z-50 flex items-center gap-2 rounded-xl bg-[#14223e] px-4 py-3 text-sm font-semibold text-white shadow-2xl"><Check className="size-4 text-[#f4ba42]" />{notice}</div>}

        <div className="mx-auto max-w-[1560px] p-4 md:p-7">
          {error ? <ErrorState message={error} retry={loadData} /> : loading ? <LoadingState /> : (
            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="min-w-0">
                {view === 'overview' ? <Overview data={data} setView={setActiveView} add={() => setEditor({ system: 'announcements' })} /> : (
                  <DataManager system={view} records={filtered} search={search} setSearch={setSearch} add={() => setEditor({ system: view })} edit={(record) => setEditor({ system: view, record })} remove={(record) => setDeleteTarget({ system: view, record })} book={setBookingTarget} action={runAction} />
                )}
              </div>
              <AgentPanel onMutation={loadData} />
            </div>
          )}
        </div>
      </section>
      {editor && <RecordEditor system={editor.system} record={editor.record} onClose={() => setEditor(null)} onSave={save} />}
      {deleteTarget && <ConfirmDelete target={deleteTarget} close={() => setDeleteTarget(null)} confirm={() => void remove().catch((e) => setNotice(e.message))} />}
      {bookingTarget && <BookingDialog room={bookingTarget} close={() => setBookingTarget(null)} confirm={async (args) => { await runAction('book_room', args, `Room ${String(bookingTarget.room_number ?? '')} booked.`); setBookingTarget(null); }} />}
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

function Overview({ data, setView, add }: { data: CampusData; setView: (view: ViewName) => void; add: () => void }) {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const classes = data.schedules.filter((item) => item.day === day).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))).slice(0, 4);
  const upcomingClasses = classes.length ? classes : data.schedules.filter((item) => item.day === 'Sunday').slice(0, 4);
  const pending = data.assignments.filter((item) => item.status === 'pending' || item.status === 'late').length;
  const available = data.rooms.filter((item) => item.status === 'available').length;
  const nextEvents = data.events.filter((item) => item.status === 'upcoming').length;
  const highNotices = data.announcements.filter((item) => item.priority === 'high').slice(0, 2);
  return <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-[#a06a00]">Your campus, right now</p><h2 className="font-heading text-2xl font-bold tracking-[-.045em] md:text-[34px]">Everything that matters today.</h2></div><Button className="h-10 rounded-xl px-4" onClick={add}><Plus/>Post announcement</Button></div>
    <div className="grid gap-4 sm:grid-cols-3">{[[pending, 'Pending assignments', 'assignments' as ViewName], [available, 'Available rooms', 'rooms' as ViewName], [nextEvents, 'Upcoming events', 'events' as ViewName]].map(([value,label,target]) => <button key={label as string} onClick={() => setView(target as ViewName)} className="group rounded-[20px] border border-border bg-card p-5 text-left shadow-[0_8px_28px_rgba(23,37,65,.04)] transition hover:-translate-y-0.5 hover:shadow-lg"><p className="font-heading text-3xl font-bold tracking-[-.05em]">{value}</p><div className="mt-2 flex items-center justify-between"><p className="text-sm font-semibold">{label}</p><ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5"/></div></button>)}</div>
    <section className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_12px_40px_rgba(23,37,65,.055)]"><div className="flex items-center justify-between border-b border-border px-5 py-4 md:px-6"><div><p className="font-heading font-bold tracking-tight">{classes.length ? 'Today’s timeline' : 'Next class day'}</p><p className="text-xs text-muted-foreground">{upcomingClasses.length} classes · live schedule</p></div><button onClick={() => setView('schedules')} className="flex items-center gap-1 text-xs font-semibold text-[#335786]">Full schedule <ChevronRight className="size-3.5"/></button></div><div className="divide-y divide-border">{upcomingClasses.map((item, index) => <article key={item.id} className="grid grid-cols-[58px_1fr_auto] items-center gap-4 px-5 py-4 md:grid-cols-[70px_1fr_auto] md:px-6"><div><p className="font-mono text-sm font-bold">{String(item.start_time)}</p><p className="text-[10px] text-muted-foreground">{String(item.day).slice(0,3)}</p></div><div className="relative border-l border-border pl-5"><span className={`absolute -left-1 top-1 size-2 rounded-full ring-4 ring-card ${index % 3 === 0 ? 'bg-[#e5a72c]' : index % 3 === 1 ? 'bg-[#4778b7]' : 'bg-[#44a98b]'}`}/><div className="flex flex-wrap items-baseline gap-x-2"><p className="font-semibold">{String(item.course)}</p><span className="text-sm text-muted-foreground">{String(item.title)}</span></div><p className="mt-1 text-xs text-muted-foreground">{String(item.instructor)}</p></div><span className="rounded-lg bg-muted px-2.5 py-1.5 font-mono text-xs font-bold text-[#335786]">{String(item.room)}</span></article>)}</div></section>
    <div className="grid gap-4 lg:grid-cols-2">{highNotices.map((item) => <article key={item.id} className="rounded-[20px] border border-red-100 bg-[linear-gradient(135deg,#fff_55%,#fff6e1)] p-5"><div className="mb-3 flex items-center gap-2"><span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold uppercase text-red-700">High priority</span><span className="text-xs text-muted-foreground">{formatDate(item.date)}</span></div><h3 className="font-heading font-bold">{String(item.title)}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{String(item.body)}</p></article>)}</div>
  </div>;
}

function DataManager({ system, records, search, setSearch, add, edit, remove, book, action }: { system: SystemName; records: CampusRecord[]; search: string; setSearch: (value: string) => void; add: () => void; edit: (record: CampusRecord) => void; remove: (record: CampusRecord) => void; book: (record: CampusRecord) => void; action: (name: string, args: Record<string, unknown>, success: string) => Promise<unknown> }) {
  const meta = systemMeta[system];
  const cell = (record: CampusRecord, key: string) => {
    if (key === 'time') return `${formatTime(record.start_time)}–${formatTime(record.end_time)}`;
    if (key === 'equipment') return <div className="flex max-w-[260px] flex-wrap gap-1">{(record.equipment as string[]).slice(0,4).map((item) => <span key={item} className="rounded-md bg-muted px-1.5 py-1 text-[10px] font-semibold">{item}</span>)}</div>;
    if (key === 'bookings') return `${(record.bookings as unknown[]).length} active`;
    if (key === 'registered') return `${String(record.registered ?? 0)}/${String(record.capacity ?? 0)}`;
    if (key === 'priority' || key === 'status') return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ring-1 ${priorityClass(record[key])}`}>{titleCase(record[key])}</span>;
    if (['date','expires','deadline'].includes(key)) return formatDate(record[key]);
    if (key === 'marks') return `${String(record[key] ?? 0)} pts`;
    if (key === 'name' || key === 'title') return <div className="max-w-[320px]"><p className="font-semibold text-foreground">{String(record[key])}</p>{key === 'name' && <p className="mt-0.5 truncate text-xs text-muted-foreground">{String(record.organizer)}</p>}{system === 'announcements' && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{String(record.body)}</p>}</div>;
    return String(record[key] ?? '—');
  };
  const userRegistered = (record: CampusRecord) => (record.registrations as { student_id: string }[])?.some((item) => item.student_id === '20-40532');
  const ownBooking = (record: CampusRecord) => (record.bookings as { booked_by: string }[])?.some((item) => item.booked_by === 'Sakibul Hassan');
  return <section className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_12px_40px_rgba(23,37,65,.055)]"><div className="flex flex-col gap-4 border-b border-border p-5 md:flex-row md:items-end md:justify-between md:p-6"><div><p className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-[#a06a00]">Data manager · {records.length} records</p><h2 className="font-heading text-2xl font-bold tracking-[-.04em]">{meta.title}</h2><p className="mt-1 text-sm text-muted-foreground">{meta.description}</p></div><Button className="h-10 rounded-xl px-4" onClick={add}><Plus/>Add {singular[system].toLowerCase()}</Button></div>
    <div className="flex items-center gap-3 border-b border-border bg-[#fbfaf6] p-4 md:px-6"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input id="data-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${system}…`} className="h-10 bg-white pl-9"/></div><span className="hidden text-xs text-muted-foreground sm:block">Live from database</span><span className="size-2 rounded-full bg-emerald-500"/></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b border-border bg-muted/30">{meta.columns.map((column) => <th key={column.key} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">{column.label}</th>)}<th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Actions</th></tr></thead><tbody>{records.map((record) => <tr key={record.id} className="border-b border-border/70 transition last:border-0 hover:bg-muted/25">{meta.columns.map((column) => <td key={column.key} className="px-5 py-3.5 align-middle text-muted-foreground">{cell(record, column.key)}</td>)}<td className="px-5 py-3.5"><div className="flex items-center justify-end gap-1">{system === 'rooms' && <><Button size="sm" variant="secondary" onClick={() => book(record)}>Book</Button>{ownBooking(record) && <Button size="sm" variant="ghost" onClick={() => void action('cancel_room_booking', { room_number: record.room_number, booking_id: null, booked_by: 'Sakibul Hassan' }, 'Room booking cancelled.').catch(() => {})}>Cancel</Button>}</>}{system === 'events' && <Button size="sm" variant={userRegistered(record) ? 'outline' : 'secondary'} onClick={() => void action(userRegistered(record) ? 'cancel_event_registration' : 'register_event', { event_name: record.name, student_id: '20-40532', student_name: 'Sakibul Hassan' }, userRegistered(record) ? 'Registration cancelled.' : 'Event registration complete.').catch(() => {})}>{userRegistered(record) ? 'Cancel' : 'Register'}</Button>}<Button size="icon-sm" variant="ghost" onClick={() => edit(record)} aria-label={`Edit ${singular[system]}`}><Edit3/></Button><Button size="icon-sm" variant="ghost" className="text-red-600" onClick={() => remove(record)} aria-label={`Delete ${singular[system]}`}><Trash2/></Button></div></td></tr>)}</tbody></table></div>
    {!records.length && <div className="grid place-items-center px-6 py-20 text-center"><Search className="mb-3 size-8 text-muted-foreground/40"/><p className="font-semibold">No records found</p><p className="mt-1 text-sm text-muted-foreground">Try a different search or add a new record.</p></div>}
  </section>;
}

function AgentPanel({ onMutation }: { onMutation: () => Promise<void> }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: 'Hi Sakibul — I can check schedules, find and book rooms, track deadlines, or manage event registration. What do you need?' }]);
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
  return <aside className="sticky top-[108px] flex h-[calc(100vh-136px)] min-h-[590px] flex-col overflow-hidden rounded-[22px] border border-[#293956] bg-[#13213c] text-white shadow-[0_18px_60px_rgba(16,27,51,.18)] 2xl:min-h-0"><div className="flex items-center justify-between border-b border-white/8 px-5 py-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#f4ba42] text-[#13213c]"><Bot className="size-[18px]"/></div><div><p className="text-sm font-bold">Campus agent</p><p className="text-[11px] text-white/42">Live across all 5 systems</p></div></div><span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#75d6b5]"><span className="size-1.5 rounded-full bg-[#65d0ad]"/>READY</span></div>
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
  const label = String(target.record.title ?? target.record.name ?? target.record.room_number ?? target.record.course ?? target.record.id ?? '');
  return <Dialog open onOpenChange={(open) => !open && close()}><DialogContent><DialogHeader><DialogTitle>Delete {singular[target.system].toLowerCase()}?</DialogTitle><DialogDescription>“{label}” will be removed from the live database. The agent will stop using it immediately.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={close}>Keep it</Button><Button variant="destructive" onClick={confirm}><Trash2/>Delete</Button></DialogFooter></DialogContent></Dialog>;
}

function BookingDialog({ room, close, confirm }: { room: CampusRecord; close: () => void; confirm: (args: Record<string, unknown>) => Promise<void> }) {
  const [date, setDate] = useState(localDate(1)); const [start, setStart] = useState('15:00'); const [end, setEnd] = useState('17:00'); const [purpose, setPurpose] = useState('Study session'); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  return <Dialog open onOpenChange={(open) => !open && close()}><DialogContent><DialogHeader><DialogTitle>Book Room {String(room.room_number)}</DialogTitle><DialogDescription>{String(room.capacity)} seats · {(room.equipment as string[]).join(', ')}</DialogDescription></DialogHeader><form onSubmit={(event) => { event.preventDefault(); setSaving(true); setError(''); void confirm({ room_number: room.room_number, date, start_time: start, end_time: end, purpose, booked_by: 'Sakibul Hassan' }).catch((caught) => { setError(caught.message); setSaving(false); }); }}><div className="grid gap-4 py-2 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-semibold sm:col-span-2">Date<Input type="date" value={date} min={localDate()} onChange={(e) => setDate(e.target.value)} required/></label><label className="space-y-1.5 text-xs font-semibold">Start<Input type="time" value={start} onChange={(e) => setStart(e.target.value)} required/></label><label className="space-y-1.5 text-xs font-semibold">End<Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required/></label><label className="space-y-1.5 text-xs font-semibold sm:col-span-2">Purpose<Input value={purpose} onChange={(e) => setPurpose(e.target.value)} required/></label></div>{error && <p className="mt-2 text-sm text-red-600">{error}</p>}<DialogFooter className="mt-4"><Button variant="outline" type="button" onClick={close}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <LoaderCircle className="animate-spin"/>}Check & book</Button></DialogFooter></form></DialogContent></Dialog>;
}

function LoadingState() { return <div className="grid min-h-[65vh] place-items-center"><div className="text-center"><LoaderCircle className="mx-auto mb-3 size-7 animate-spin text-[#335786]"/><p className="text-sm font-semibold">Syncing campus data…</p></div></div>; }
function ErrorState({ message, retry }: { message: string; retry: () => Promise<void> }) { return <div className="grid min-h-[65vh] place-items-center"><div className="max-w-md rounded-2xl border border-red-100 bg-white p-7 text-center shadow-lg"><CircleAlert className="mx-auto mb-3 size-8 text-red-500"/><h2 className="font-heading text-lg font-bold">Campus data is unavailable</h2><p className="mt-2 text-sm text-muted-foreground">{message}</p><Button className="mt-5" onClick={() => void retry()}><RefreshCw/>Try again</Button></div></div>; }
