"use client";

import * as React from "react";
import { CalendarDays, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { formatTimeRange, timeToMinutes, WEEK_DAYS } from "@/lib/datetime";
import {
  createSchedule,
  deleteSchedule,
  fetchSchedules,
  updateSchedule,
} from "@/lib/data/schedules";
import type { Schedule } from "@/lib/types";
import {
  ScheduleFormDialog,
  type ScheduleFormValues,
} from "./schedule-form-dialog";
import { DeleteScheduleDialog } from "./delete-schedule-dialog";
import {
  FeedbackToaster,
  useFeedback,
} from "./feedback-toaster";

type Status = "loading" | "ready" | "error";
const ALL_DAYS = "__all__";

export function ScheduleContent() {
  const [status, setStatus] = React.useState<Status>("loading");
  const [schedules, setSchedules] = React.useState<Schedule[]>([]);
  const [dayFilter, setDayFilter] = React.useState<string>(ALL_DAYS);
  const [courseQuery, setCourseQuery] = React.useState("");

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<Schedule | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<Schedule | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const { items, notify, dismiss } = useFeedback();

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    try {
      const data = await fetchSchedules(signal);
      if (signal?.aborted) return;
      setSchedules(data);
      setStatus("ready");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const filtered = React.useMemo(() => {
    const q = courseQuery.trim().toLowerCase();
    return schedules
      .filter((s) => (dayFilter === ALL_DAYS ? true : s.day === dayFilter))
      .filter((s) =>
        q === ""
          ? true
          : s.course.toLowerCase().includes(q) ||
            s.title.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const dayDiff =
          WEEK_DAYS.indexOf(a.day as (typeof WEEK_DAYS)[number]) -
          WEEK_DAYS.indexOf(b.day as (typeof WEEK_DAYS)[number]);
        if (dayDiff !== 0) return dayDiff;
        return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
      });
  }, [schedules, dayFilter, courseQuery]);

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(schedule: Schedule) {
    setFormMode("edit");
    setEditing(schedule);
    setFormOpen(true);
  }

  function openDelete(schedule: Schedule) {
    setDeleteTarget(schedule);
    setDeleteOpen(true);
  }

  async function handleSubmit(values: ScheduleFormValues) {
    if (formMode === "create") {
      const created = await createSchedule(values);
      setSchedules((prev) => [...prev, created]);
      notify("success", `Added ${created.course} to the schedule.`);
    } else if (editing) {
      const { id: _id, ...rest } = values;
      const updated = await updateSchedule(editing.id, rest);
      setSchedules((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      notify("success", `Updated ${updated.course}.`);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    await deleteSchedule(target.id);
    setSchedules((prev) => prev.filter((s) => s.id !== target.id));
    notify("success", `Deleted ${target.course} from the schedule.`);
  }

  const hasAnySchedules = schedules.length > 0;
  const isFiltering = dayFilter !== ALL_DAYS || courseQuery.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
              aria-hidden="true"
            />
            <Input
              value={courseQuery}
              onChange={(e) => setCourseQuery(e.target.value)}
              placeholder="Search course or title"
              className="pl-8 sm:w-64"
              aria-label="Search by course or title"
            />
          </div>
          <Select value={dayFilter} onValueChange={setDayFilter}>
            <SelectTrigger className="sm:w-40" aria-label="Filter by day">
              <SelectValue placeholder="All days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DAYS}>All days</SelectItem>
              {WEEK_DAYS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="sm:w-auto">
          <Plus aria-hidden="true" />
          Add class
        </Button>
      </div>

      {status === "loading" ? (
        <ScheduleSkeleton />
      ) : status === "error" ? (
        <ErrorState
          title="Couldn't load schedules"
          description="We couldn't reach the campus data service. Please try again."
          onRetry={() => load()}
        />
      ) : !hasAnySchedules ? (
        <EmptyState
          icon={CalendarDays}
          title="No classes scheduled yet"
          description="Add the first class to start building the weekly schedule."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Add class
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching classes"
          description="No classes match your current filters. Try adjusting the day or search term."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setDayFilter(ALL_DAYS);
                setCourseQuery("");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "class" : "classes"}
            {isFiltering ? " (filtered)" : ""}
          </p>

          {/* Desktop table */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.course}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-schedule/10 text-schedule">
                          {s.day}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatTimeRange(s.start_time, s.end_time)}
                      </TableCell>
                      <TableCell>{s.room}</TableCell>
                      <TableCell>{s.instructor}</TableCell>
                      <TableCell>{s.section}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(s)}
                            aria-label={`Edit ${s.course}`}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openDelete(s)}
                            aria-label={`Delete ${s.course}`}
                            className="text-danger hover:text-danger"
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((s) => (
              <Card key={s.id} size="sm" className="gap-2">
                <div className="flex items-start justify-between gap-2 px-4">
                  <div className="min-w-0">
                    <div className="font-medium">{s.course}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {s.title}
                    </div>
                  </div>
                  <Badge className="shrink-0 bg-schedule/10 text-schedule">
                    {s.day}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 text-sm text-muted-foreground">
                  <span className="tabular-nums">
                    {formatTimeRange(s.start_time, s.end_time)}
                  </span>
                  <span>Room {s.room}</span>
                  <span className="truncate">{s.instructor}</span>
                  <span>Section {s.section}</span>
                </div>
                <div className="flex justify-end gap-1 px-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(s)}
                  >
                    <Pencil aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDelete(s)}
                    className="text-danger hover:text-danger"
                  >
                    <Trash2 aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ScheduleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initial={editing}
        onSubmit={handleSubmit}
      />
      <DeleteScheduleDialog
        schedule={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
      <FeedbackToaster items={items} onDismiss={dismiss} />
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <Card className="p-0">
      <div className="flex flex-col divide-y divide-border-subtle">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}
