"use client";

import * as React from "react";
import { CalendarClock, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { fetchRoomBookings } from "@/lib/data/rooms";
import { formatDate, formatTimeRange } from "@/lib/datetime";
import type { Room, RoomBooking } from "@/types/database";
import { RoomStatusBadge } from "./room-status-badge";

export function RoomDetailsDialog({
  room,
  open,
  onOpenChange,
  onCancelBooking,
  refreshKey,
}: {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelBooking: (booking: RoomBooking) => Promise<void>;
  refreshKey: number;
}) {
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [bookings, setBookings] = React.useState<RoomBooking[]>([]);
  const [cancelingId, setCancelingId] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (roomId: string, signal?: AbortSignal) => {
      setStatus("loading");
      try {
        const data = await fetchRoomBookings(roomId, signal);
        if (signal?.aborted) return;
        setBookings(data);
        setStatus("ready");
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setStatus("error");
      }
    },
    []
  );

  React.useEffect(() => {
    if (!open || !room) return;
    const controller = new AbortController();
    load(room.id, controller.signal);
    return () => controller.abort();
  }, [open, room, load, refreshKey]);

  async function handleCancel(booking: RoomBooking) {
    setCancelingId(booking.booking_id);
    try {
      await onCancelBooking(booking);
      setBookings((prev) =>
        prev.filter((b) => b.booking_id !== booking.booking_id)
      );
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {room ? `Room ${room.room_number}` : "Room details"}
            {room ? <RoomStatusBadge status={room.status} /> : null}
          </DialogTitle>
          <DialogDescription>
            {room
              ? `${room.type} · Floor ${room.floor} · Capacity ${room.capacity}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {room ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                Equipment
              </p>
              {room.equipment.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {room.equipment.map((eq) => (
                    <Badge key={eq} variant="secondary" className="capitalize">
                      {eq}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  No equipment listed.
                </p>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-subtle">
                Bookings
              </p>
              {status === "loading" ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Loading bookings…
                </div>
              ) : status === "error" ? (
                <ErrorState
                  title="Couldn't load bookings"
                  description="Please try again."
                  onRetry={() => room && load(room.id)}
                  className="py-6"
                />
              ) : bookings.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title="No bookings"
                  description="This room has no bookings yet."
                  className="border-0 bg-transparent py-6"
                />
              ) : (
                <ul className="flex flex-col divide-y divide-border-subtle">
                  {bookings.map((b) => (
                    <li
                      key={b.booking_id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{b.purpose}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(b.date)} ·{" "}
                          {formatTimeRange(b.start_time, b.end_time)}
                        </p>
                        <p className="text-xs text-text-subtle">
                          Booked by {b.booked_by}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-danger hover:text-danger"
                        aria-label={`Cancel booking: ${b.purpose}`}
                        disabled={cancelingId === b.booking_id}
                        onClick={() => handleCancel(b)}
                      >
                        {cancelingId === b.booking_id ? (
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
