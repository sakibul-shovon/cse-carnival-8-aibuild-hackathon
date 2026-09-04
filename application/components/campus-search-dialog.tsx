'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, Bell, BookOpen, Building2, Calendar, CalendarDays,
  Clock, FileCheck2, FileText, Filter, GraduationCap, MapPin, Search, Sparkles,
  User, X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { CampusData, CampusRecord, SystemName } from '@/lib/campus-types';

type SearchFilter = 'all' | 'courses' | 'teachers' | 'rooms' | 'assignments' | 'announcements' | 'events';

export interface SearchResultItem {
  id: string;
  category: 'courses' | 'teachers' | 'rooms' | 'assignments' | 'announcements' | 'events';
  title: string;
  subtitle: string;
  meta: string;
  targetView: SystemName;
  record: CampusRecord;
}

interface CampusSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CampusData;
  onSelectResult: (view: SystemName, record?: CampusRecord) => void;
}

export function CampusSearchDialog({
  open,
  onOpenChange,
  data,
  onSelectResult,
}: CampusSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Reset query on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setFilter('all');
    }
  }, [open]);

function toStr(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value.toString();
  return fallback;
}

  // Index all real CampusOS data
  const allResults = useMemo(() => {
    const items: SearchResultItem[] = [];

    // 1. Courses (from schedules)
    const courseMap = new Map<string, { course: string; title: string; record: CampusRecord }>();
    for (const sch of data.schedules) {
      const code = toStr(sch.course).trim();
      if (code && !courseMap.has(code)) {
        courseMap.set(code, {
          course: code,
          title: toStr(sch.title),
          record: sch,
        });
      }
    }
    for (const c of courseMap.values()) {
      items.push({
        id: `course-${c.course}`,
        category: 'courses',
        title: c.course,
        subtitle: c.title,
        meta: 'Active Course',
        targetView: 'schedules',
        record: c.record,
      });
    }

    // 2. Teachers (from schedules and notices)
    const teacherMap = new Map<string, { name: string; courses: Set<string>; record: CampusRecord }>();
    for (const sch of data.schedules) {
      const instructor = toStr(sch.instructor).trim();
      if (instructor && instructor !== 'TBA') {
        if (!teacherMap.has(instructor)) {
          teacherMap.set(instructor, { name: instructor, courses: new Set(), record: sch });
        }
        teacherMap.get(instructor)?.courses.add(toStr(sch.course));
      }
    }
    for (const ann of data.announcements) {
      const postedBy = toStr(ann.posted_by).trim();
      if (postedBy && (postedBy.startsWith('Prof') || postedBy.startsWith('Ms') || postedBy.startsWith('Mr') || postedBy.startsWith('Dr'))) {
        if (!teacherMap.has(postedBy)) {
          teacherMap.set(postedBy, { name: postedBy, courses: new Set(), record: ann });
        }
      }
    }
    for (const t of teacherMap.values()) {
      const courseList = Array.from(t.courses).join(', ');
      items.push({
        id: `teacher-${t.name}`,
        category: 'teachers',
        title: t.name,
        subtitle: courseList ? `Instructor for: ${courseList}` : 'Faculty Member',
        meta: 'Faculty',
        targetView: 'schedules',
        record: t.record,
      });
    }

    // 3. Rooms
    for (const room of data.rooms) {
      const roomNum = toStr(room.room_number);
      const equipment = Array.isArray(room.equipment) ? (room.equipment as string[]).join(', ') : '';
      items.push({
        id: `room-${toStr(room.id)}`,
        category: 'rooms',
        title: `Room ${roomNum}`,
        subtitle: `${toStr(room.type, 'Classroom')} · Cap: ${toStr(room.capacity, '0')} seats · ${equipment || 'Standard equipment'}`,
        meta: toStr(room.status, 'available') === 'available' ? 'Available' : 'Booked',
        targetView: 'rooms',
        record: room,
      });
    }

    // 4. Assignments
    for (const asgn of data.assignments) {
      items.push({
        id: `asgn-${toStr(asgn.id)}`,
        category: 'assignments',
        title: toStr(asgn.title),
        subtitle: `${toStr(asgn.course)} · Deadline: ${toStr(asgn.deadline, '—')} · ${toStr(asgn.marks, '0')} pts`,
        meta: toStr(asgn.status, 'pending').toUpperCase(),
        targetView: 'assignments',
        record: asgn,
      });
    }

    // 5. Announcements
    for (const ann of data.announcements) {
      items.push({
        id: `ann-${toStr(ann.id)}`,
        category: 'announcements',
        title: toStr(ann.title),
        subtitle: `${toStr(ann.posted_by, 'AUST')} · ${toStr(ann.body).slice(0, 100)}...`,
        meta: toStr(ann.priority, 'normal').toUpperCase(),
        targetView: 'announcements',
        record: ann,
      });
    }

    // 6. Events
    for (const evt of data.events) {
      items.push({
        id: `evt-${toStr(evt.id)}`,
        category: 'events',
        title: toStr(evt.name),
        subtitle: `Venue: Room ${toStr(evt.venue, '—')} · Date: ${toStr(evt.date, '—')} · Organizer: ${toStr(evt.organizer, '—')}`,
        meta: `${toStr(evt.registered, '0')}/${toStr(evt.capacity, '0')} booked`,
        targetView: 'events',
        record: evt,
      });
    }

    return items;
  }, [data]);

  // Filtered & Searched Results
  const filteredResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    return allResults.filter((item) => {
      if (filter !== 'all' && item.category !== filter) return false;
      if (!q) return true;
      const haystack = `${item.title} ${item.subtitle} ${item.meta}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [allResults, filter, query]);

  // Count per category
  const counts = useMemo(() => {
    const map: Record<SearchFilter, number> = {
      all: allResults.length,
      courses: 0,
      teachers: 0,
      rooms: 0,
      assignments: 0,
      announcements: 0,
      events: 0,
    };
    for (const item of allResults) {
      map[item.category] += 1;
    }
    return map;
  }, [allResults]);

  const handleSelect = (item: SearchResultItem) => {
    onSelectResult(item.targetView, item.record);
    onOpenChange(false);
  };

  const categoryIcon = (cat: SearchResultItem['category']) => {
    switch (cat) {
      case 'courses':
        return <BookOpen className="size-4 text-blue-600" />;
      case 'teachers':
        return <User className="size-4 text-emerald-600" />;
      case 'rooms':
        return <Building2 className="size-4 text-amber-600" />;
      case 'assignments':
        return <FileCheck2 className="size-4 text-indigo-600" />;
      case 'announcements':
        return <Bell className="size-4 text-red-600" />;
      case 'events':
        return <Sparkles className="size-4 text-purple-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-[700px]">
        {/* Header Search Input */}
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="size-5 shrink-0 text-muted-foreground mr-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, teachers, rooms, assignments, notices, events..."
            className="h-10 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/70 bg-muted/25 px-4 py-2 text-xs">
          <span className="flex items-center gap-1 font-semibold text-muted-foreground mr-1">
            <Filter className="size-3" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'courses', label: 'Courses' },
            { id: 'teachers', label: 'Teachers' },
            { id: 'rooms', label: 'Rooms' },
            { id: 'assignments', label: 'Assignments' },
            { id: 'announcements', label: 'Announcements' },
            { id: 'events', label: 'Events' },
          ].map((tab) => {
            const isSelected = filter === tab.id;
            const count = counts[tab.id as SearchFilter];
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as SearchFilter)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition ${
                  isSelected
                    ? 'bg-[#101b33] text-white shadow-xs'
                    : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.2 text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Results List */}
        <div className="max-h-[55vh] overflow-y-auto p-3 space-y-1.5">
          {filteredResults.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <Search className="mb-2 size-8 text-muted-foreground/40" />
              <p className="font-heading text-sm font-bold">No campus results found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try searching by course code (e.g. CSE 4113), room number (e.g. 7A04), or teacher name.
              </p>
            </div>
          ) : (
            filteredResults.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-transparent p-3 text-left transition hover:border-[#335786]/20 hover:bg-muted/40"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted/60 transition group-hover:bg-card">
                    {categoryIcon(item.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-heading text-sm font-bold text-foreground group-hover:text-[#335786]">
                        {item.title}
                      </p>
                      <Badge variant="outline" className="text-[10px] font-semibold uppercase shrink-0">
                        {item.category.slice(0, -1)}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-block rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                    {item.meta}
                  </span>
                  <div className="grid size-7 place-items-center rounded-lg bg-muted/40 text-muted-foreground opacity-60 transition group-hover:bg-[#335786] group-hover:text-white group-hover:opacity-100">
                    <ArrowRight className="size-3.5" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer Hint */}
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span>
            Press <kbd className="rounded border bg-card px-1.5 py-0.5 font-mono text-[10px]">ESC</kbd> to close
          </span>
          <span>Click any item to view in CampusOS</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
