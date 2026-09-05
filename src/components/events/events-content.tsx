"use client";

import * as React from "react";
import {
  CalendarDays,
  Clock,
  Info,
  MapPin,
  PartyPopper,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { FeedbackToaster, useFeedback } from "@/components/feedback-toaster";
import {
  cancelRegistration,
  createEvent,
  deleteEvent,
  fetchEvents,
  registerForEvent,
  updateEvent,
} from "@/lib/data/events";
import { formatDate, formatTime, timeToMinutes } from "@/lib/datetime";
import type { Event, EventRegistration } from "@/types/database";
import { EventFormDialog, type EventSubmitValues } from "./event-form-dialog";
import { DeleteEventDialog } from "./delete-event-dialog";
import { RegisterDialog, type RegistrationFormValues } from "./register-dialog";
import { EventDetailsDialog } from "./event-details-dialog";
import { EventStatusBadge } from "./event-status-badge";

type Status = "loading" | "ready" | "error";
const ALL = "__all__";

function canRegister(e: Event): boolean {
  return (
    e.status !== "cancelled" &&
    e.status !== "completed" &&
    e.status !== "full" &&
    e.registered < e.capacity
  );
}

export function EventsContent() {
  const [status, setStatus] = React.useState<Status>("loading");
  const [events, setEvents] = React.useState<Event[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(ALL);

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<Event | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<Event | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const [registerTarget, setRegisterTarget] = React.useState<Event | null>(null);
  const [registerOpen, setRegisterOpen] = React.useState(false);

  const [detailsTarget, setDetailsTarget] = React.useState<Event | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsRefreshKey, setDetailsRefreshKey] = React.useState(0);

  const { items, notify, dismiss } = useFeedback();

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    try {
      const data = await fetchEvents(signal);
      if (signal?.aborted) return;
      setEvents(data);
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

  // Registration count/status are owned by the backend; refetch to stay in sync.
  const refreshEvents = React.useCallback(async () => {
    try {
      const data = await fetchEvents();
      setEvents(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...events]
      .filter((e) => (statusFilter === ALL ? true : e.status === statusFilter))
      .filter((e) =>
        q === ""
          ? true
          : e.name.toLowerCase().includes(q) ||
            e.organizer.toLowerCase().includes(q) ||
            e.venue.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
      });
  }, [events, search, statusFilter]);

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(event: Event) {
    setFormMode("edit");
    setEditing(event);
    setFormOpen(true);
  }

  async function handleFormSubmit(values: EventSubmitValues) {
    if (formMode === "create") {
      const created = await createEvent(values);
      setEvents((prev) => [...prev, created]);
      notify("success", `Created "${created.name}".`);
    } else if (editing) {
      const { id: _id, registered: _r, ...rest } = values;
      const updated = await updateEvent(editing.id, rest);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      notify("success", `Updated "${updated.name}".`);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    await deleteEvent(target.id);
    setEvents((prev) => prev.filter((e) => e.id !== target.id));
    notify("success", `Deleted "${target.name}".`);
  }

  async function handleRegister(values: RegistrationFormValues) {
    if (!registerTarget) return;
    // Backend enforces capacity/full, cancelled, completed and duplicate rules.
    await registerForEvent(registerTarget.id, values);
    notify("success", `Registered ${values.name} for "${registerTarget.name}".`);
    await refreshEvents();
  }

  async function handleCancelRegistration(registration: EventRegistration) {
    try {
      await cancelRegistration(registration.event_id, registration.student_id);
      await refreshEvents();
      setDetailsRefreshKey((k) => k + 1);
      notify("success", `Cancelled registration for ${registration.name}.`);
    } catch (err) {
      notify("error", (err as Error).message || "Could not cancel.");
      throw err;
    }
  }

  const hasAny = events.length > 0;
  const isFiltering = statusFilter !== ALL || search.trim() !== "";

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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search event, organizer, venue"
              className="pl-8 sm:w-64"
              aria-label="Search events"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-40" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="full">Full</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden="true" />
          Create event
        </Button>
      </div>

      {status === "loading" ? (
        <EventsSkeleton />
      ) : status === "error" ? (
        <ErrorState
          title="Couldn't load events"
          description="We couldn't reach the campus data service. Please try again."
          onRetry={() => load()}
        />
      ) : !hasAny ? (
        <EmptyState
          icon={PartyPopper}
          title="No events yet"
          description="Create the first campus event to get started."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Create event
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching events"
          description="No events match your current filters. Try adjusting them."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter(ALL);
                setSearch("");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "event" : "events"}
            {isFiltering ? " (filtered)" : ""}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => {
              const registerable = canRegister(event);
              const pct = Math.min(
                100,
                Math.round((event.registered / event.capacity) * 100)
              );
              return (
                <Card key={event.id} className="gap-3">
                  <div className="flex items-start justify-between gap-2 px-4">
                    <span className="font-semibold leading-snug">
                      {event.name}
                    </span>
                    <EventStatusBadge status={event.status} />
                  </div>

                  <div className="flex flex-col gap-1 px-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      {formatDate(event.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" aria-hidden="true" />
                      {formatTime(event.start_time)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {event.venue} · {event.organizer}
                    </span>
                  </div>

                  <div className="px-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="size-3.5" aria-hidden="true" />
                        {event.registered}/{event.capacity} registered
                      </span>
                      <span className="text-text-subtle">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-event"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 px-4">
                    <Button
                      size="sm"
                      onClick={() => {
                        setRegisterTarget(event);
                        setRegisterOpen(true);
                      }}
                      disabled={!registerable}
                    >
                      <UserPlus aria-hidden="true" />
                      Register
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDetailsTarget(event);
                        setDetailsOpen(true);
                      }}
                    >
                      <Info aria-hidden="true" />
                      Details
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => openEdit(event)}
                      aria-label={`Edit ${event.name}`}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-danger hover:text-danger"
                      onClick={() => {
                        setDeleteTarget(event);
                        setDeleteOpen(true);
                      }}
                      aria-label={`Delete ${event.name}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initial={editing}
        onSubmit={handleFormSubmit}
      />
      <DeleteEventDialog
        event={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
      <RegisterDialog
        event={registerTarget}
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onSubmit={handleRegister}
      />
      <EventDetailsDialog
        event={detailsTarget}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onCancelRegistration={handleCancelRegistration}
        refreshKey={detailsRefreshKey}
      />
      <FeedbackToaster items={items} onDismiss={dismiss} />
    </div>
  );
}

function EventsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="gap-3">
          <div className="flex items-start justify-between px-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex flex-col gap-2 px-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-44" />
          </div>
          <div className="px-4">
            <Skeleton className="h-1.5 w-full" />
          </div>
          <div className="flex gap-1.5 px-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}
