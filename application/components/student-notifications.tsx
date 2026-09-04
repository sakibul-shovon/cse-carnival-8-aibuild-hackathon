'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, AlertTriangle, ArrowRight, Bell, BookOpen, Check, CheckCheck,
  Clock, ExternalLink, FileText, GraduationCap, Info, MapPin, Volume2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CampusData, CampusRecord, SystemName } from '@/lib/campus-types';
import type { AuthUser } from '@/lib/auth';

type ViewName = 'overview' | 'profile' | SystemName;

export interface StudentNotification {
  id: string;
  type: 'room_change' | 'cancellation' | 'assignment' | 'exam' | 'class' | 'announcement';
  title: string;
  message: string;
  priority: 'urgent' | 'important' | 'warning' | 'info';
  timestamp: string;
  targetView: ViewName;
  record?: CampusRecord;
}

// Crisp dual-tone notification chime via Web Audio API (no external file dependencies)
export function playCampusNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Harmonic 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch {
    // Silent fail if blocked by browser policy before first user gesture
  }
}

function toStr(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value.toString();
  return fallback;
}

export function useStudentNotifications(user: AuthUser, data: CampusData) {
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(`campusos_read_${user.id}`);
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const [activeToast, setActiveToast] = useState<StudentNotification | null>(null);

  // Derive notifications from live data
  const notifications = useMemo(() => {
    const list: StudentNotification[] = [];

    // 1. Room Changes, Reschedules, and Cancellations from announcements
    for (const ann of data.announcements) {
      const title = toStr(ann.title);
      const body = toStr(ann.body);
      const combined = `${title} ${body}`.toLowerCase();

      const isRoomChange = combined.includes('rescheduled') || combined.includes('moved to') || combined.includes('room');
      const isCancelled = combined.includes('cancelled') || combined.includes('postponed');
      const isExam = combined.includes('midterm') || combined.includes('exam') || combined.includes('syllabus');

      if (isCancelled) {
        list.push({
          id: `ann-cancel-${toStr(ann.id)}`,
          type: 'cancellation',
          title: `Class Cancelled: ${title}`,
          message: body.slice(0, 110) + '...',
          priority: 'urgent',
          timestamp: toStr(ann.date, 'Today'),
          targetView: 'announcements',
          record: ann,
        });
      } else if (isRoomChange) {
        list.push({
          id: `ann-room-${toStr(ann.id)}`,
          type: 'room_change',
          title: `Timetable / Room Change: ${title}`,
          message: body.slice(0, 110) + '...',
          priority: 'urgent',
          timestamp: toStr(ann.date, 'Today'),
          targetView: 'schedules',
          record: ann,
        });
      } else if (isExam) {
        list.push({
          id: `ann-exam-${toStr(ann.id)}`,
          type: 'exam',
          title: `Exam / Syllabus Notice: ${title}`,
          message: body.slice(0, 110) + '...',
          priority: 'important',
          timestamp: toStr(ann.date, 'Today'),
          targetView: 'announcements',
          record: ann,
        });
      } else if (ann.priority === 'high') {
        list.push({
          id: `ann-urgent-${toStr(ann.id)}`,
          type: 'announcement',
          title: `Urgent Campus Notice: ${title}`,
          message: body.slice(0, 110) + '...',
          priority: 'urgent',
          timestamp: toStr(ann.date, 'Today'),
          targetView: 'announcements',
          record: ann,
        });
      }
    }

    // 2. Pending assignments due soon (within 3 days or late)
    const now = new Date();
    for (const asgn of data.assignments) {
      if (asgn.status === 'pending' || asgn.status === 'late') {
        const deadlineStr = toStr(asgn.deadline);
        const deadlineDate = new Date(`${deadlineStr}T23:59:59`);
        const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 3 || asgn.status === 'late') {
          list.push({
            id: `asgn-due-${toStr(asgn.id)}`,
            type: 'assignment',
            title: `Assignment Due Soon: ${toStr(asgn.title)}`,
            message: `${toStr(asgn.course)} is due in ${diffDays < 0 ? 'overdue' : diffDays === 0 ? 'today' : `${diffDays} days`} (${toStr(asgn.marks)} pts).`,
            priority: diffDays <= 1 ? 'urgent' : 'warning',
            timestamp: toStr(asgn.deadline, 'Soon'),
            targetView: 'assignments',
            record: asgn,
          });
        }
      }
    }

    // Sort urgent first, then by timestamp
    return list.sort((a, b) => {
      const priorityOrder = { urgent: 0, important: 1, warning: 2, info: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [data.announcements, data.assignments]);

  // Anti-spam & audio trigger: only play sound for genuinely new un-played alerts
  useEffect(() => {
    if (typeof window === 'undefined' || notifications.length === 0) return;

    try {
      const soundKey = `campusos_sound_${user.id}`;
      const playedRaw = localStorage.getItem(soundKey);
      const playedSet: Set<string> = playedRaw ? new Set(JSON.parse(playedRaw) as string[]) : new Set();

      const newUrgentNotifications = notifications.filter(
        (n) => (n.priority === 'urgent' || n.priority === 'important') && !playedSet.has(n.id)
      );

      if (newUrgentNotifications.length > 0) {
        // Play audio chime once
        playCampusNotificationSound();

        // Show the top new alert as popup toast
        setActiveToast(newUrgentNotifications[0]);

        // Mark all as played so it never repeats or spams
        for (const n of newUrgentNotifications) {
          playedSet.add(n.id);
        }
        localStorage.setItem(soundKey, JSON.stringify(Array.from(playedSet)));
      }
    } catch {
      // LocalStorage access failsafe
    }
  }, [notifications, user.id]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(`campusos_read_${user.id}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, [user.id]);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const n of notifications) next.add(n.id);
      try {
        localStorage.setItem(`campusos_read_${user.id}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, [notifications, user.id]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.has(n.id)).length;
  }, [notifications, readIds]);

  return {
    notifications,
    unreadCount,
    readIds,
    activeToast,
    dismissToast: () => setActiveToast(null),
    markAsRead,
    markAllAsRead,
  };
}

interface StudentNotificationBellProps {
  user: AuthUser;
  data: CampusData;
  onNavigate: (view: ViewName) => void;
}

export function StudentNotificationBell({ user, data, onNavigate }: StudentNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    readIds,
    activeToast,
    dismissToast,
    markAsRead,
    markAllAsRead,
  } = useStudentNotifications(user, data);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleItemClick = (n: StudentNotification) => {
    markAsRead(n.id);
    setOpen(false);
    onNavigate(n.targetView);
  };

  const getNotificationIcon = (type: StudentNotification['type'], priority: StudentNotification['priority']) => {
    if (type === 'cancellation' || type === 'room_change') {
      return <AlertTriangle className="size-4 text-red-600" />;
    }
    if (type === 'assignment') {
      return <Clock className="size-4 text-amber-600" />;
    }
    if (type === 'exam') {
      return <GraduationCap className="size-4 text-purple-600" />;
    }
    return <Bell className="size-4 text-blue-600" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Navbar Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative grid size-10 place-items-center rounded-xl border border-border bg-card shadow-xs transition hover:bg-muted"
        aria-label="Open notifications"
      >
        <Bell className="size-4 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Menu */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[360px] sm:w-[420px] rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-bold">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 text-[10px] font-bold">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs font-semibold text-[#335786] hover:underline"
              >
                <CheckCheck className="size-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Check className="mx-auto mb-2 size-6 text-emerald-500" />
                <p className="text-sm font-semibold">All caught up</p>
                <p className="mt-1 text-xs">No notifications right now.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isRead = readIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    className={`group relative flex items-start gap-3 p-3.5 transition hover:bg-muted/40 ${
                      isRead ? 'opacity-70 bg-transparent' : 'bg-muted/15'
                    }`}
                  >
                    <div
                      className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-card border border-border/80 shadow-2xs cursor-pointer"
                      onClick={() => handleItemClick(n)}
                    >
                      {getNotificationIcon(n.type, n.priority)}
                    </div>

                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleItemClick(n)}>
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`truncate text-xs ${
                            isRead ? 'font-medium text-foreground' : 'font-bold text-foreground'
                          }`}
                        >
                          {n.title}
                        </p>
                        {!isRead && <span className="size-2 rounded-full bg-blue-600 shrink-0" />}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                        {n.message}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{n.timestamp}</span>
                        <span>•</span>
                        <span className="font-semibold text-[#335786] group-hover:underline">
                          View in {n.targetView} →
                        </span>
                      </div>
                    </div>

                    {!isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Mark as read"
                      >
                        <Check className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-border bg-muted/20 p-2.5 text-center">
            <button
              onClick={() => {
                setOpen(false);
                onNavigate('announcements');
              }}
              className="text-xs font-semibold text-[#335786] hover:underline"
            >
              View campus announcement board
            </button>
          </div>
        </div>
      )}

      {/* FLOATING TOAST POPUP FOR IMPORTANT REAL-TIME ALERTS */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            {getNotificationIcon(activeToast.type, activeToast.priority)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-red-100 px-2 py-0.2 text-[10px] font-bold uppercase text-red-700">
                Campus Alert
              </span>
              <span className="text-[10px] text-muted-foreground">Just now</span>
            </div>
            <p className="mt-1 font-heading text-xs font-bold text-foreground">
              {activeToast.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {activeToast.message}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 rounded-lg text-xs"
                onClick={() => {
                  markAsRead(activeToast.id);
                  onNavigate(activeToast.targetView);
                  dismissToast();
                }}
              >
                View
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 rounded-lg text-xs"
                onClick={dismissToast}
              >
                Dismiss
              </Button>
            </div>
          </div>

          <button
            onClick={dismissToast}
            className="grid size-6 place-items-center text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
