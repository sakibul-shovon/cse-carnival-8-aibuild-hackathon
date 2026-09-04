'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowUpRight, Bell, BookOpen, Bot, Calendar, CalendarDays,
  Check, CheckCircle2, ChevronRight, ExternalLink, FileText,
  GraduationCap, Info, MapPin, Plus, Search, Send, Sparkles, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CampusData, CampusRecord, SystemName } from '@/lib/campus-types';
import type { AuthUser } from '@/lib/auth';

type ViewName = 'overview' | 'profile' | SystemName;

interface OverviewCommandCenterProps {
  user: AuthUser;
  data: CampusData;
  setView: (view: ViewName) => void;
  runAction: (action: string, args: Record<string, unknown>, success: string) => Promise<unknown>;
  onAskAI: (prompt: string) => void;
  onPostAnnouncement: () => void;
  onBookRoom?: (room: CampusRecord) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

function formatTime(value: unknown) {
  if (!value) return '—';
  const str = String(value);
  const [hourStr, minStr] = str.split(':');
  const hour = Number(hourStr || '0');
  const minute = Number(minStr || '0');
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${pad(minute)} ${meridiem}`;
}

function formatDate(value: unknown) {
  if (!value) return '—';
  const raw = String(value);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${raw}T12:00:00`));
}

function getDayGreeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Working late';
}

function getDaysRemaining(dateStr: string) {
  const target = new Date(`${dateStr}T23:59:59`);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

interface ClassAlertInfo {
  type: 'room_change' | 'cancelled' | 'rescheduled' | 'notice';
  originalRoom?: string;
  newRoom?: string;
  newTime?: string;
  message: string;
  announcementTitle: string;
  announcementBody: string;
  postedBy: string;
}

export function OverviewCommandCenter({
  user,
  data,
  setView,
  runAction,
  onAskAI,
  onPostAnnouncement,
}: OverviewCommandCenterProps) {
  const [aiPrompt, setAiPrompt] = useState('');
  const [activeNotice, setActiveNotice] = useState<CampusRecord | null>(null);
  const [noticeFilter, setNoticeFilter] = useState<'all' | 'high' | 'room' | 'exam'>('all');
  const [upcomingTab, setUpcomingTab] = useState<'assignments' | 'exams' | 'events'>('assignments');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const now = new Date();
  const currentHour = now.getHours();
  const greeting = getDayGreeting(currentHour);
  const firstName = user.fullName.split(' ')[0] || user.fullName;

  // Real today's day of week
  const todayWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
  const currentMinutes = currentHour * 60 + now.getMinutes();

  // Schedule weekday selection (Default to today if classes exist, else Sunday which is the first university class day)
  const todayClasses = useMemo(() => {
    return data.schedules.filter((item) => String(item.day).toLowerCase() === todayWeekday.toLowerCase())
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
  }, [data.schedules, todayWeekday]);

  const [selectedDay, setSelectedDay] = useState<string>(() => {
    return todayClasses.length > 0 ? todayWeekday : 'Sunday';
  });

  const isTodaySelected = selectedDay.toLowerCase() === todayWeekday.toLowerCase();

  const displayedClasses = useMemo(() => {
    return data.schedules
      .filter((item) => String(item.day).toLowerCase() === selectedDay.toLowerCase())
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
  }, [data.schedules, selectedDay]);

  // Intelligent Class Alert Matcher: Cross-references schedules with active announcements
  const classAlerts = useMemo(() => {
    const alertsMap = new Map<string, ClassAlertInfo>();

    for (const cls of data.schedules) {
      const courseCode = String(cls.course || '').toUpperCase().trim();
      const courseNumber = courseCode.replace(/[^0-9]/g, '');

      // Check announcements referencing this course
      for (const ann of data.announcements) {
        const title = String(ann.title || '');
        const body = String(ann.body || '');
        const combined = `${title} ${body}`.toUpperCase();

        if (combined.includes(courseCode) || (courseNumber && combined.includes(`CSE ${courseNumber}`))) {
          // Detect room change or reschedule
          const isCancelled = combined.includes('CANCELLED') || combined.includes('POSTPONED');
          const isRescheduled = combined.includes('RESCHEDULED') || combined.includes('MOVED TO');

          // Extract new room pattern like "ROOM 7A04" or "7A04"
          const roomMatch = combined.match(/(?:ROOM|INTO|TO ROOM)\s*([0-9][A-C][0-9]{2})/i);
          const timeMatch = combined.match(/(?:AT|FROM)\s*([0-9]{1,2}(?::[0-9]{2})?\s*(?:AM|PM))/i);

          if (isCancelled) {
            alertsMap.set(cls.id, {
              type: 'cancelled',
              message: 'Class cancelled per latest announcement',
              announcementTitle: title,
              announcementBody: body,
              postedBy: String(ann.posted_by || 'Department'),
            });
            break;
          } else if (isRescheduled || roomMatch) {
            alertsMap.set(cls.id, {
              type: 'room_change',
              originalRoom: String(cls.room || ''),
              newRoom: roomMatch ? roomMatch[1].toUpperCase() : undefined,
              newTime: timeMatch ? timeMatch[1] : undefined,
              message: roomMatch
                ? `Moved to Room ${roomMatch[1].toUpperCase()}${timeMatch ? ` at ${timeMatch[1]}` : ''}`
                : 'Schedule / venue updated by instructor',
              announcementTitle: title,
              announcementBody: body,
              postedBy: String(ann.posted_by || 'Department'),
            });
            break;
          } else if (String(ann.priority) === 'high') {
            alertsMap.set(cls.id, {
              type: 'notice',
              message: title,
              announcementTitle: title,
              announcementBody: body,
              postedBy: String(ann.posted_by || 'Department'),
            });
          }
        }
      }
    }
    return alertsMap;
  }, [data.schedules, data.announcements]);

  // Announcements filtered
  const filteredAnnouncements = useMemo(() => {
    return data.announcements.filter((ann) => {
      if (noticeFilter === 'high') return ann.priority === 'high';
      if (noticeFilter === 'room') {
        const text = `${String(ann.title)} ${String(ann.body)}`.toLowerCase();
        return text.includes('room') || text.includes('rescheduled') || text.includes('cancelled') || text.includes('moved');
      }
      if (noticeFilter === 'exam') {
        const text = `${String(ann.title)} ${String(ann.body)}`.toLowerCase();
        return text.includes('midterm') || text.includes('exam') || text.includes('syllabus') || text.includes('test');
      }
      return true;
    }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [data.announcements, noticeFilter]);

  // Academic Snapshot Calculations (VERIFIED REAL DATA ONLY)
  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    for (const item of data.schedules) {
      if (item.course) set.add(String(item.course));
    }
    return Array.from(set);
  }, [data.schedules]);

  const pendingAssignments = useMemo(() => {
    return data.assignments.filter((item) => item.status === 'pending' || item.status === 'late');
  }, [data.assignments]);

  const totalPendingMarks = useMemo(() => {
    return pendingAssignments.reduce((sum, item) => sum + (Number(item.marks) || 0), 0);
  }, [pendingAssignments]);

  const examNotices = useMemo(() => {
    return data.announcements.filter((ann) => {
      const text = `${String(ann.title)} ${String(ann.body)}`.toLowerCase();
      return text.includes('midterm') || text.includes('exam') || text.includes('syllabus');
    });
  }, [data.announcements]);

  const userRegisteredEvents = useMemo(() => {
    return data.events.filter((evt) => {
      const regs = evt.registrations as { student_id?: string }[] | undefined;
      return Array.isArray(regs) && regs.some((r) => r.student_id === user.studentId);
    });
  }, [data.events, user.studentId]);

  // Check if real CGPA or Attendance exists on user object
  const realCgpa = (user as unknown as Record<string, unknown>).cgpa;
  const realAttendance = (user as unknown as Record<string, unknown>).attendance;

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    onAskAI(aiPrompt.trim());
    setAiPrompt('');
  };

  const handleEventToggle = async (event: CampusRecord) => {
    const isRegistered = userRegisteredEvents.some((e) => e.id === event.id);
    setActionLoading(event.id);
    try {
      if (isRegistered) {
        await runAction(
          'cancel_event_registration',
          { event_name: event.name, student_id: user.studentId },
          `Registration for "${String(event.name)}" cancelled.`
        );
      } else {
        await runAction(
          'register_event',
          { event_name: event.name, student_id: user.studentId, student_name: user.fullName },
          `Registered for "${String(event.name)}"!`
        );
      }
    } catch {
      // Notification handled in parent
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. PERSONALIZED WELCOME BANNER */}
      <section className="relative overflow-hidden rounded-[26px] border border-[#233557] bg-[radial-gradient(ellipse_at_top_left,#294572_0%,#13223e_70%)] p-6 text-white shadow-[0_16px_45px_rgba(16,27,51,.18)] md:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4ba42]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#f4ba42] ring-1 ring-[#f4ba42]/30">
                <Sparkles className="size-3.5" />
                Student Command Center
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live Campus Sync
              </span>
            </div>

            <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
              {greeting}, <span className="text-[#f4ba42]">{firstName}</span> 👋
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
              Here is your live campus pulse for today. Check your schedule, track assignments, view room changes, and consult the AI assistant.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-white/60">
              <span className="rounded-lg bg-white/8 px-2.5 py-1 font-medium text-white/90">
                {user.department} Department
              </span>
              <span>•</span>
              <span className="rounded-lg bg-white/8 px-2.5 py-1 font-medium text-white/90">
                {user.semester} Semester
              </span>
              <span>•</span>
              <span className="font-mono text-white/80">ID: {user.studentId}</span>
              <span>•</span>
              <span className="text-white/50">
                {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(now)}
              </span>
            </div>
          </div>

          {/* Quick Summary Pill */}
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/6 p-3.5 backdrop-blur-md sm:gap-4 lg:shrink-0">
            <div className="px-2 text-center">
              <p className="font-heading text-2xl font-black text-white">{todayClasses.length}</p>
              <p className="text-[11px] font-medium text-white/60">Classes Today</p>
            </div>
            <div className="border-x border-white/10 px-2 text-center">
              <p className="font-heading text-2xl font-black text-[#f4ba42]">{pendingAssignments.length}</p>
              <p className="text-[11px] font-medium text-white/60">Pending Tasks</p>
            </div>
            <div className="px-2 text-center">
              <p className="font-heading text-2xl font-black text-red-400">
                {data.announcements.filter((a) => a.priority === 'high').length}
              </p>
              <p className="text-[11px] font-medium text-white/60">Urgent Alerts</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. QUICK ACTIONS BAR */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#a06a00]">⚡ Quick Actions</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <button
            onClick={() => setView('schedules')}
            className="group flex flex-col items-start rounded-2xl border border-border bg-card p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#335786]/30 hover:shadow-md"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#335786] transition group-hover:bg-[#335786] group-hover:text-white">
              <CalendarDays className="size-5" />
            </div>
            <p className="mt-3 font-heading text-sm font-bold">Timetable</p>
            <p className="text-[11px] text-muted-foreground">View full week</p>
          </button>

          <button
            onClick={() => setView('announcements')}
            className="group flex flex-col items-start rounded-2xl border border-border bg-card p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#335786]/30 hover:shadow-md"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-[#a06a00] transition group-hover:bg-[#a06a00] group-hover:text-white">
              <Bell className="size-5" />
            </div>
            <p className="mt-3 font-heading text-sm font-bold">Notices</p>
            <p className="text-[11px] text-muted-foreground">{data.announcements.length} live posts</p>
          </button>

          <button
            onClick={() => setView('events')}
            className="group flex flex-col items-start rounded-2xl border border-border bg-card p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#335786]/30 hover:shadow-md"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-700 transition group-hover:bg-purple-700 group-hover:text-white">
              <Sparkles className="size-5" />
            </div>
            <p className="mt-3 font-heading text-sm font-bold">Events</p>
            <p className="text-[11px] text-muted-foreground">{userRegisteredEvents.length} registered</p>
          </button>

          <button
            onClick={() => setView('rooms')}
            className="group flex flex-col items-start rounded-2xl border border-border bg-card p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#335786]/30 hover:shadow-md"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
              <MapPin className="size-5" />
            </div>
            <p className="mt-3 font-heading text-sm font-bold">Find Room</p>
            <p className="text-[11px] text-muted-foreground">Check & book</p>
          </button>

          <button
            onClick={() => onAskAI('When is my next class?')}
            className="col-span-2 group flex flex-col items-start rounded-2xl border border-[#335786]/20 bg-[linear-gradient(135deg,#13223e,#213a63)] p-4 text-left text-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-md sm:col-span-1"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-[#f4ba42] text-[#101b33]">
              <Bot className="size-5" />
            </div>
            <p className="mt-3 font-heading text-sm font-bold">Ask AI</p>
            <p className="text-[11px] text-white/60">Campus assistant</p>
          </button>
        </div>
      </section>

      {/* 3. INTERACTIVE "ASK CAMPUSOS AI" BANNER (MAIN VISUAL FOCUS #3) */}
      <section className="overflow-hidden rounded-[24px] border border-[#2b3e60] bg-[#101b33] p-5 text-white shadow-[0_12px_36px_rgba(16,27,51,.15)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#f4ba42] text-[#101b33] shadow-lg shadow-[#f4ba42]/20">
              <Bot className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold">Ask CampusOS AI</h3>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Live Data Connected
                </span>
              </div>
              <p className="text-xs text-white/60">
                Ask about room changes, schedules, assignment deadlines, or room bookings.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Question Chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            'When is my next class?',
            'Any room changes or cancellations today?',
            'What assignments are due this week?',
            'Find an available room with projector tomorrow',
            'Register me for AI Build Hackathon',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => onAskAI(prompt)}
              className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-white/75 transition hover:border-[#f4ba42]/50 hover:bg-white/12 hover:text-white"
            >
              <Sparkles className="size-3 text-[#f4ba42]" />
              <span>{prompt}</span>
              <ArrowUpRight className="size-3 opacity-50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </button>
          ))}
        </div>

        {/* Direct Ask Input */}
        <form onSubmit={handleAskSubmit} className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask anything about campus (e.g. Where is CSE 4113 today?)"
              className="h-11 w-full rounded-xl border border-white/12 bg-white/8 pl-10 pr-4 text-sm text-white placeholder:text-white/35 focus:border-[#f4ba42] focus:outline-none focus:ring-1 focus:ring-[#f4ba42]"
            />
          </div>
          <Button
            type="submit"
            disabled={!aiPrompt.trim()}
            className="h-11 rounded-xl bg-[#f4ba42] font-bold text-[#101b33] hover:bg-[#e0a938]"
          >
            <Send className="size-4" />
            Ask
          </Button>
        </form>
      </section>

      {/* 4. MAIN 2-COLUMN GRID: TODAY'S CLASSES (LEFT) & REAL-TIME ALERTS (RIGHT) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: TODAY'S CLASSES (MAIN VISUAL FOCUS #1) */}
        <section className="space-y-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-[#335786]" />
                <h2 className="font-heading text-xl font-bold tracking-tight">Today’s Classes</h2>
                {isTodaySelected && (
                  <Badge variant="secondary" className="bg-[#335786]/10 text-[#335786] font-semibold text-[11px]">
                    Live Timetable
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {displayedClasses.length} {displayedClasses.length === 1 ? 'class' : 'classes'} on {selectedDay}
              </p>
            </div>

            {/* Day Selector Tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 text-xs">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day) => {
                const isSelected = selectedDay.toLowerCase() === day.toLowerCase();
                const isActualToday = todayWeekday.toLowerCase() === day.toLowerCase();
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`relative rounded-lg px-2.5 py-1 font-semibold transition ${
                      isSelected
                        ? 'bg-[#335786] text-white shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {day.slice(0, 3)}
                    {isActualToday && (
                      <span
                        className={`absolute -top-1 -right-0.5 size-2 rounded-full ${
                          isSelected ? 'bg-[#f4ba42]' : 'bg-[#335786]'
                        }`}
                        title="Today"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weekend / Off-Day Banner if Today Has No Classes */}
          {!isTodaySelected && todayClasses.length === 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-900">
              <Info className="size-4 shrink-0 text-amber-700" />
              <p>
                <strong>Today is {todayWeekday} (Weekend/Off day).</strong> Showing class schedule for <strong>{selectedDay}</strong>. You can switch days using the selector above.
              </p>
            </div>
          )}

          {/* Class List */}
          {displayedClasses.length === 0 ? (
            <div className="grid place-items-center rounded-[22px] border border-dashed border-border bg-card p-10 text-center">
              <Calendar className="mb-2 size-8 text-muted-foreground/40" />
              <p className="font-heading text-base font-bold">No classes scheduled for {selectedDay}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Enjoy your break or check upcoming assignments and events.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-xl"
                onClick={() => setView('schedules')}
              >
                View Full Weekly Timetable
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedClasses.map((item) => {
                const alert = classAlerts.get(item.id);
                const startTimeStr = String(item.start_time || '00:00');
                const endTimeStr = String(item.end_time || '00:00');

                const [startH, startM] = startTimeStr.split(':').map(Number);
                const [endH, endM] = endTimeStr.split(':').map(Number);
                const classStartMinutes = startH * 60 + startM;
                const classEndMinutes = endH * 60 + endM;

                const isOngoing =
                  isTodaySelected &&
                  currentMinutes >= classStartMinutes &&
                  currentMinutes <= classEndMinutes &&
                  alert?.type !== 'cancelled';

                const isPast =
                  isTodaySelected &&
                  currentMinutes > classEndMinutes;

                return (
                  <div
                    key={item.id}
                    className={`relative overflow-hidden rounded-[22px] border p-4 shadow-xs transition hover:shadow-md md:p-5 ${
                      alert?.type === 'room_change' || alert?.type === 'rescheduled'
                        ? 'border-amber-300 bg-[linear-gradient(135deg,#ffffff_55%,#fff9eb)] ring-1 ring-amber-300/40'
                        : alert?.type === 'cancelled'
                        ? 'border-red-200 bg-[linear-gradient(135deg,#ffffff_55%,#fef2f2)] opacity-85'
                        : isOngoing
                        ? 'border-emerald-300 bg-[linear-gradient(135deg,#ffffff_55%,#ecfdf5)] ring-2 ring-emerald-400/50'
                        : 'border-border bg-card'
                    }`}
                  >
                    {/* Status Badge Top-Right */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          {formatTime(item.start_time)} – {formatTime(item.end_time)}
                        </span>

                        {isOngoing && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                            <span className="size-1.5 animate-ping rounded-full bg-emerald-500" />
                            Ongoing Now
                          </span>
                        )}

                        {isPast && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            Completed
                          </span>
                        )}

                        {!isOngoing && !isPast && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            Upcoming
                          </span>
                        )}
                      </div>

                      {/* Room Badge */}
                      <div className="flex items-center gap-1.5">
                        {alert?.newRoom ? (
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <span className="text-muted-foreground line-through">
                              Room {String(item.room)}
                            </span>
                            <span className="rounded-lg bg-amber-500 px-2.5 py-1 font-bold text-white shadow-xs">
                              Room {alert.newRoom}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-xs font-bold text-[#335786]">
                            Room {String(item.room)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Course Title & Teacher */}
                    <div className="mt-3">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-heading text-base font-bold text-foreground">
                          {String(item.course)}
                        </h3>
                        <span className="text-sm font-medium text-muted-foreground">
                          {String(item.title)}
                        </span>
                        {item.section && (
                          <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            Sec {String(item.section)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="size-3.5" />
                        <span>{String(item.instructor)}</span>
                      </p>
                    </div>

                    {/* REAL-TIME ALERT BANNER (If room change, cancellation, etc.) */}
                    {alert && (
                      <div
                        className={`mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl p-2.5 text-xs font-medium ${
                          alert.type === 'cancelled'
                            ? 'bg-red-100/90 text-red-900'
                            : 'bg-amber-100/90 text-amber-900'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            className={`size-4 shrink-0 ${
                              alert.type === 'cancelled' ? 'text-red-700' : 'text-amber-700'
                            }`}
                          />
                          <span>
                            <strong>Notice Alert:</strong> {alert.message}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setActiveNotice({
                              id: `notice-${item.id}`,
                              title: alert.announcementTitle,
                              body: alert.announcementBody,
                              posted_by: alert.postedBy,
                              date: formatDate(now),
                            })
                          }
                          className="font-bold underline hover:opacity-80"
                        >
                          View notice details
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: REAL-TIME CAMPUS ALERTS & ANNOUNCEMENTS (MAIN VISUAL FOCUS #2) */}
        <section className="space-y-4 lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-[#a06a00]" />
                <h2 className="font-heading text-xl font-bold tracking-tight">Campus Alerts</h2>
                <span className="size-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Real-time notices, cancellations & exams
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl text-xs"
              onClick={onPostAnnouncement}
            >
              <Plus className="size-3.5" />
              Post Notice
            </Button>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'high', label: '🚨 Urgent' },
              { id: 'room', label: '⚠️ Room Changes' },
              { id: 'exam', label: '📝 Exams' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setNoticeFilter(tab.id as typeof noticeFilter)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  noticeFilter === tab.id
                    ? 'bg-[#101b33] text-white shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Announcements Stack */}
          {filteredAnnouncements.length === 0 ? (
            <div className="grid place-items-center rounded-[22px] border border-dashed border-border bg-card p-8 text-center">
              <Bell className="mb-2 size-6 text-muted-foreground/40" />
              <p className="text-sm font-semibold">No alerts in this category</p>
              <p className="mt-1 text-xs text-muted-foreground">All clear right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnnouncements.slice(0, 4).map((ann) => {
                const isHigh = ann.priority === 'high';
                const isMedium = ann.priority === 'medium';
                return (
                  <article
                    key={ann.id}
                    onClick={() => setActiveNotice(ann)}
                    className={`group cursor-pointer rounded-[20px] border p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md ${
                      isHigh
                        ? 'border-red-200 bg-[linear-gradient(135deg,#ffffff_55%,#fff5f5)] ring-1 ring-red-300/30'
                        : isMedium
                        ? 'border-amber-200/70 bg-[linear-gradient(135deg,#ffffff_55%,#fffdf5)]'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isHigh
                            ? 'bg-red-100 text-red-700'
                            : isMedium
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isHigh ? '🚨 Urgent' : isMedium ? 'Notice' : 'Update'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{formatDate(ann.date)}</span>
                    </div>

                    <h3 className="font-heading text-sm font-bold text-foreground transition group-hover:text-[#335786]">
                      {String(ann.title)}
                    </h3>

                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {String(ann.body)}
                    </p>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                      <span className="truncate max-w-[180px]">By {String(ann.posted_by)}</span>
                      <span className="flex items-center gap-1 font-semibold text-[#335786] group-hover:underline">
                        Read full notice <ChevronRight className="size-3" />
                      </span>
                    </div>
                  </article>
                );
              })}

              {filteredAnnouncements.length > 4 && (
                <Button
                  variant="ghost"
                  className="w-full text-xs font-semibold text-[#335786]"
                  onClick={() => setView('announcements')}
                >
                  View all {filteredAnnouncements.length} announcements <ChevronRight className="size-3.5" />
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* 5. ACADEMIC SNAPSHOT (VERIFIED REAL DATA ONLY) */}
      <section className="rounded-[24px] border border-border bg-card p-5 shadow-xs md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#a06a00]">Academic Progress</p>
            <h2 className="font-heading text-xl font-bold tracking-tight">Academic Snapshot</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {user.semester} Semester · {user.department}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Active Courses */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 transition hover:bg-muted/35">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Enrolled Courses</p>
              <div className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <BookOpen className="size-4" />
              </div>
            </div>
            <p className="mt-2 font-heading text-2xl font-bold">{uniqueCourses.length}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {uniqueCourses.slice(0, 3).join(', ')}...
            </p>
          </div>

          {/* Pending Assignments */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 transition hover:bg-muted/35">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Assignments Due</p>
              <div className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <FileText className="size-4" />
              </div>
            </div>
            <p className="mt-2 font-heading text-2xl font-bold">{pendingAssignments.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalPendingMarks} total marks at stake
            </p>
          </div>

          {/* Upcoming Exams */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 transition hover:bg-muted/35">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Upcoming Exams</p>
              <div className="grid size-8 place-items-center rounded-lg bg-purple-50 text-purple-700">
                <GraduationCap className="size-4" />
              </div>
            </div>
            <p className="mt-2 font-heading text-2xl font-bold">{examNotices.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {examNotices.length > 0 ? 'Midterm notices active' : 'No exams posted'}
            </p>
          </div>

          {/* Registered Campus Events */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 transition hover:bg-muted/35">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">My Campus Events</p>
              <div className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <Sparkles className="size-4" />
              </div>
            </div>
            <p className="mt-2 font-heading text-2xl font-bold">{userRegisteredEvents.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Active event registrations</p>
          </div>
        </div>

        {/* Real Data Notice for CGPA & Attendance */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Info className="size-3.5" />
            <span>
              {realCgpa || realAttendance
                ? `CGPA: ${String(realCgpa ?? '—')} · Attendance: ${String(realAttendance ?? '—')}%`
                : 'Attendance & CGPA: Verified official grades will be synchronized as published by the registrar.'}
            </span>
          </div>
          <span className="font-medium text-[#335786]">Official Records</span>
        </div>
      </section>

      {/* 6. UPCOMING COMMAND HUB (ASSIGNMENTS, EXAMS, EVENTS) */}
      <section className="overflow-hidden rounded-[24px] border border-border bg-card shadow-xs">
        <div className="border-b border-border p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[#a06a00]">Looking Ahead</p>
              <h2 className="font-heading text-xl font-bold tracking-tight">Upcoming Deadlines & Events</h2>
            </div>

            {/* Hub Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-muted p-1 text-xs">
              <button
                onClick={() => setUpcomingTab('assignments')}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                  upcomingTab === 'assignments' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                Assignments ({pendingAssignments.length})
              </button>
              <button
                onClick={() => setUpcomingTab('exams')}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                  upcomingTab === 'exams' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                Exams & Prep ({examNotices.length})
              </button>
              <button
                onClick={() => setUpcomingTab('events')}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                  upcomingTab === 'events' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                Events ({data.events.length})
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6">
          {upcomingTab === 'assignments' && (
            <div className="space-y-3">
              {pendingAssignments.length === 0 ? (
                <div className="grid place-items-center py-10 text-center">
                  <CheckCircle2 className="mb-2 size-8 text-emerald-500" />
                  <p className="font-semibold">All caught up!</p>
                  <p className="text-xs text-muted-foreground">No pending assignment deadlines.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {pendingAssignments.map((asgn) => {
                    const daysLeft = getDaysRemaining(String(asgn.deadline));
                    const isUrgent = daysLeft <= 3;
                    return (
                      <div
                        key={asgn.id}
                        className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-[#335786]/30 hover:shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="font-bold text-[10px]">
                              {String(asgn.course)}
                            </Badge>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isUrgent ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {daysLeft < 0 ? 'Late' : daysLeft === 0 ? 'Due Today' : `Due in ${daysLeft}d`}
                            </span>
                          </div>

                          <h4 className="mt-2.5 font-heading text-sm font-bold text-foreground">
                            {String(asgn.title)}
                          </h4>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {String(asgn.description)}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
                          <span>Platform: {String(asgn.submission_platform)}</span>
                          <span className="font-semibold text-foreground">{String(asgn.marks)} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {upcomingTab === 'exams' && (
            <div className="space-y-3">
              {examNotices.length === 0 ? (
                <div className="grid place-items-center py-10 text-center">
                  <GraduationCap className="mb-2 size-8 text-muted-foreground/40" />
                  <p className="font-semibold">No upcoming exam announcements</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {examNotices.map((exam) => (
                    <div
                      key={exam.id}
                      onClick={() => setActiveNotice(exam)}
                      className="cursor-pointer rounded-2xl border border-purple-200 bg-[linear-gradient(135deg,#ffffff_60%,#faf5ff)] p-4 shadow-xs transition hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-purple-800">
                          Midterm / Exam
                        </span>
                        <span className="text-[11px] text-muted-foreground">{formatDate(exam.date)}</span>
                      </div>
                      <h4 className="mt-2 font-heading text-sm font-bold">{String(exam.title)}</h4>
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{String(exam.body)}</p>
                      <p className="mt-3 text-[11px] font-semibold text-[#335786]">Click to read syllabus & details →</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {upcomingTab === 'events' && (
            <div className="space-y-3">
              <div className="grid gap-4 md:grid-cols-2">
                {data.events.slice(0, 4).map((evt) => {
                  const isRegistered = userRegisteredEvents.some((e) => e.id === evt.id);
                  const capacity = Number(evt.capacity) || 1;
                  const registered = Number(evt.registered) || 0;
                  const percent = Math.min(100, Math.round((registered / capacity) * 100));

                  return (
                    <div
                      key={evt.id}
                      className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-[#335786]/30 hover:shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {formatDate(evt.date)} · {formatTime(evt.start_time)}
                          </span>
                          {isRegistered ? (
                            <Badge className="bg-emerald-500 font-bold text-[10px] text-white">
                              ✓ You’re Registered
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Venue: {String(evt.venue)}</span>
                          )}
                        </div>

                        <h4 className="mt-2 font-heading text-sm font-bold text-foreground">
                          {String(evt.name)}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {String(evt.description)}
                        </p>

                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Capacity</span>
                            <span>{registered}/{capacity} registered</span>
                          </div>
                          <Progress value={percent} className="h-1.5" />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-[11px] text-muted-foreground">By {String(evt.organizer)}</span>
                        <Button
                          size="sm"
                          variant={isRegistered ? 'outline' : 'default'}
                          disabled={actionLoading === evt.id || (!isRegistered && registered >= capacity)}
                          onClick={() => handleEventToggle(evt)}
                          className="h-8 rounded-xl text-xs"
                        >
                          {isRegistered ? 'Cancel' : registered >= capacity ? 'Full' : 'Register Now'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 7. CAMPUS EVENTS SPOTLIGHT WITH 1-CLICK REGISTRATION */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-purple-600" />
              <h2 className="font-heading text-xl font-bold tracking-tight">Campus Events</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Hackathons, seminars, and club activities happening at AUST
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs"
            onClick={() => setView('events')}
          >
            Manage Events <ChevronRight className="size-3.5" />
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.events.map((evt) => {
            const isRegistered = userRegisteredEvents.some((e) => e.id === evt.id);
            const capacity = Number(evt.capacity) || 1;
            const registered = Number(evt.registered) || 0;
            const percent = Math.min(100, Math.round((registered / capacity) * 100));

            return (
              <div
                key={evt.id}
                className={`flex flex-col justify-between rounded-[22px] border p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md ${
                  isRegistered
                    ? 'border-emerald-300 bg-[linear-gradient(135deg,#ffffff_55%,#f0fdf4)] ring-1 ring-emerald-300/40'
                    : 'border-border bg-card'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-purple-700">
                      {String(evt.organizer)}
                    </span>
                    {isRegistered && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <Check className="size-3" /> Registered
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2.5 font-heading text-base font-bold text-foreground">
                    {String(evt.name)}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {String(evt.description)}
                  </p>

                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3.5 text-[#335786]" />
                      <span>{formatDate(evt.date)} at {formatTime(evt.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-emerald-600" />
                      <span>Venue: Room {String(evt.venue)}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                      <span>Attendance</span>
                      <span>{registered} / {capacity} seats</span>
                    </div>
                    <Progress value={percent} className="h-1.5" />
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border/60">
                  <Button
                    className="w-full rounded-xl text-xs font-bold"
                    variant={isRegistered ? 'outline' : 'default'}
                    disabled={actionLoading === evt.id || (!isRegistered && registered >= capacity)}
                    onClick={() => handleEventToggle(evt)}
                  >
                    {actionLoading === evt.id ? (
                      'Processing...'
                    ) : isRegistered ? (
                      'Cancel My Registration'
                    ) : registered >= capacity ? (
                      'Event Full'
                    ) : (
                      'Register for Event'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FULL ANNOUNCEMENT DETAIL DIALOG */}
      {activeNotice && (
        <Dialog open onOpenChange={(open) => !open && setActiveNotice(null)}>
          <DialogContent className="sm:max-w-[580px]">
            <DialogHeader>
              <div className="mb-1 flex items-center gap-2">
                <Badge
                  variant={activeNotice.priority === 'high' ? 'destructive' : 'secondary'}
                  className="font-bold text-[10px] uppercase"
                >
                  {String(activeNotice.priority ?? 'Notice')} Priority
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Posted {formatDate(activeNotice.date)}
                </span>
              </div>
              <DialogTitle className="font-heading text-xl font-bold leading-snug">
                {String(activeNotice.title)}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Author: {String(activeNotice.posted_by)}
                {activeNotice.expires ? ` · Valid until ${formatDate(activeNotice.expires)}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="my-3 rounded-xl bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-line text-foreground">
              {String(activeNotice.body)}
            </div>

            <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAskAI(`Tell me more about the notice: "${String(activeNotice.title)}"`);
                  setActiveNotice(null);
                }}
                className="gap-1.5 text-xs text-[#335786]"
              >
                <Bot className="size-3.5" />
                Ask AI about this
              </Button>
              <Button size="sm" onClick={() => setActiveNotice(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
