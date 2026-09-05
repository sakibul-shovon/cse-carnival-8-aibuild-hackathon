"use client";

import * as React from "react";
import {
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { fetchEventRegistrations } from "@/lib/data/events";
import { formatDate, formatTimeRange } from "@/lib/datetime";
import type { Event, EventRegistration } from "@/types/database";
import { EventStatusBadge } from "./event-status-badge";

export function EventDetailsDialog({
  event,
  open,
  onOpenChange,
  onCancelRegistration,
  refreshKey,
}: {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelRegistration: (registration: EventRegistration) => Promise<void>;
  refreshKey: number;
}) {
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [registrations, setRegistrations] = React.useState<EventRegistration[]>(
    []
  );
  const [cancelingId, setCancelingId] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (eventId: string, signal?: AbortSignal) => {
      setStatus("loading");
      try {
        const data = await fetchEventRegistrations(eventId, signal);
        if (signal?.aborted) return;
        setRegistrations(data);
        setStatus("ready");
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setStatus("error");
      }
    },
    []
  );

  React.useEffect(() => {
    if (!open || !event) return;
    const controller = new AbortController();
    load(event.id, controller.signal);
    return () => controller.abort();
  }, [open, event, load, refreshKey]);

  async function handleCancel(registration: EventRegistration) {
    setCancelingId(registration.student_id);
    try {
      await onCancelRegistration(registration);
      setRegistrations((prev) =>
        prev.filter((r) => r.student_id !== registration.student_id)
      );
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {event ? event.name : "Event details"}
            {event ? <EventStatusBadge status={event.status} /> : null}
          </DialogTitle>
          <DialogDescription>{event ? event.organizer : ""}</DialogDescription>
        </DialogHeader>

        {event ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground/90">{event.description}</p>

            <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4" aria-hidden="true" />
                {formatDate(event.date)}
                {event.end_date && event.end_date !== event.date
                  ? ` – ${formatDate(event.end_date)}`
                  : ""}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="size-4" aria-hidden="true" />
                {formatTimeRange(event.start_time, event.end_time)}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="size-4" aria-hidden="true" />
                {event.venue}
              </span>
              <span className="flex items-center gap-2">
                <Users className="size-4" aria-hidden="true" />
                {event.registered}/{event.capacity} registered
              </span>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-subtle">
                Registrations
              </p>
              {status === "loading" ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Loading registrations…
                </div>
              ) : status === "error" ? (
                <ErrorState
                  title="Couldn't load registrations"
                  description="Please try again."
                  onRetry={() => event && load(event.id)}
                  className="py-6"
                />
              ) : registrations.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No registrations yet"
                  description="Registered students will appear here."
                  className="border-0 bg-transparent py-6"
                />
              ) : (
                <ul className="flex flex-col divide-y divide-border-subtle">
                  {registrations.map((r) => (
                    <li
                      key={r.student_id}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <User
                          className="size-4 shrink-0 text-text-subtle"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {r.name}
                          </p>
                          <p className="text-xs text-text-subtle">
                            {r.student_id}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-danger hover:text-danger"
                        aria-label={`Cancel registration for ${r.name}`}
                        disabled={cancelingId === r.student_id}
                        onClick={() => handleCancel(r)}
                      >
                        {cancelingId === r.student_id ? (
                          <Loader2 className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 aria-hidden="true" />
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
