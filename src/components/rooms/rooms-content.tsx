"use client";

import * as React from "react";
import {
  CalendarPlus,
  DoorOpen,
  Info,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
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
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { FeedbackToaster, useFeedback } from "@/components/feedback-toaster";
import {
  cancelBooking,
  createBooking,
  createRoom,
  deleteRoom,
  fetchBookings,
  fetchRooms,
  updateRoom,
} from "@/lib/data/rooms";
import type { Room, RoomBooking } from "@/types/database";
import { RoomFormDialog, type RoomSubmitValues } from "./room-form-dialog";
import { DeleteRoomDialog } from "./delete-room-dialog";
import { BookRoomDialog, type BookingFormValues } from "./book-room-dialog";
import { RoomDetailsDialog } from "./room-details-dialog";
import { RoomStatusBadge } from "./room-status-badge";

type Status = "loading" | "ready" | "error";
const ALL = "__all__";

export function RoomsContent() {
  const [status, setStatus] = React.useState<Status>("loading");
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [bookings, setBookings] = React.useState<RoomBooking[]>([]);

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState(ALL);
  const [statusFilter, setStatusFilter] = React.useState(ALL);

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<Room | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<Room | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const [bookTarget, setBookTarget] = React.useState<Room | null>(null);
  const [bookOpen, setBookOpen] = React.useState(false);

  const [detailsTarget, setDetailsTarget] = React.useState<Room | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsRefreshKey, setDetailsRefreshKey] = React.useState(0);

  const { items, notify, dismiss } = useFeedback();

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    try {
      const [roomsData, bookingsData] = await Promise.all([
        fetchRooms(signal),
        fetchBookings(signal),
      ]);
      if (signal?.aborted) return;
      setRooms(roomsData);
      setBookings(bookingsData);
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

  const refreshBookings = React.useCallback(async () => {
    try {
      setBookings(await fetchBookings());
    } catch {
      // non-fatal; counts will refresh on next full load
    }
  }, []);

  const bookingCountByRoom = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      map.set(b.room_id, (map.get(b.room_id) ?? 0) + 1);
    }
    return map;
  }, [bookings]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...rooms]
      .filter((r) => (typeFilter === ALL ? true : r.type === typeFilter))
      .filter((r) => (statusFilter === ALL ? true : r.status === statusFilter))
      .filter((r) =>
        q === ""
          ? true
          : r.room_number.toLowerCase().includes(q) ||
            r.equipment.some((e) => e.toLowerCase().includes(q))
      )
      .sort((a, b) => a.room_number.localeCompare(b.room_number));
  }, [rooms, search, typeFilter, statusFilter]);

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(room: Room) {
    setFormMode("edit");
    setEditing(room);
    setFormOpen(true);
  }
  function openDelete(room: Room) {
    setDeleteTarget(room);
    setDeleteOpen(true);
  }
  function openBook(room: Room) {
    setBookTarget(room);
    setBookOpen(true);
  }
  function openDetails(room: Room) {
    setDetailsTarget(room);
    setDetailsOpen(true);
  }

  async function handleRoomSubmit(values: RoomSubmitValues) {
    if (formMode === "create") {
      const created = await createRoom(values);
      setRooms((prev) => [...prev, created]);
      notify("success", `Added room ${created.room_number}.`);
    } else if (editing) {
      const { id: _id, ...rest } = values;
      const updated = await updateRoom(editing.id, rest);
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      notify("success", `Updated room ${updated.room_number}.`);
    }
  }

  async function handleDeleteRoom() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    await deleteRoom(target.id);
    setRooms((prev) => prev.filter((r) => r.id !== target.id));
    setBookings((prev) => prev.filter((b) => b.room_id !== target.id));
    notify("success", `Deleted room ${target.room_number}.`);
  }

  async function handleBooking(values: BookingFormValues) {
    if (!bookTarget) return;
    // Backend validates conflicts; a rejection throws and is shown in the dialog.
    await createBooking({ room_id: bookTarget.id, ...values });
    notify("success", `Booked room ${bookTarget.room_number}.`);
    await refreshBookings();
  }

  async function handleCancelBooking(booking: RoomBooking) {
    try {
      await cancelBooking(booking.booking_id);
      setBookings((prev) =>
        prev.filter((b) => b.booking_id !== booking.booking_id)
      );
      setDetailsRefreshKey((k) => k + 1);
      notify("success", "Booking cancelled.");
    } catch (err) {
      notify("error", (err as Error).message || "Could not cancel booking.");
      throw err;
    }
  }

  const hasAny = rooms.length > 0;
  const isFiltering =
    typeFilter !== ALL || statusFilter !== ALL || search.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room or equipment"
              className="pl-8 sm:w-60"
              aria-label="Search by room number or equipment"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="sm:w-36" aria-label="Filter by type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              <SelectItem value="classroom">Classroom</SelectItem>
              <SelectItem value="lab">Lab</SelectItem>
              <SelectItem value="seminar">Seminar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-36" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden="true" />
          Add room
        </Button>
      </div>

      {status === "loading" ? (
        <RoomsSkeleton />
      ) : status === "error" ? (
        <ErrorState
          title="Couldn't load rooms"
          description="We couldn't reach the campus data service. Please try again."
          onRetry={() => load()}
        />
      ) : !hasAny ? (
        <EmptyState
          icon={DoorOpen}
          title="No rooms yet"
          description="Add the first room to start building the directory."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Add room
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching rooms"
          description="No rooms match your current filters. Try adjusting them."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setTypeFilter(ALL);
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
            {filtered.length} {filtered.length === 1 ? "room" : "rooms"}
            {isFiltering ? " (filtered)" : ""}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((room) => {
              const count = bookingCountByRoom.get(room.id) ?? 0;
              return (
                <Card key={room.id} className="gap-3">
                  <div className="flex items-start justify-between gap-2 px-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <DoorOpen
                          className="size-4 text-room"
                          aria-hidden="true"
                        />
                        <span className="text-lg font-semibold">
                          {room.room_number}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                        {room.type} · Floor {room.floor}
                      </p>
                    </div>
                    <RoomStatusBadge status={room.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden="true" />
                      {room.capacity} seats
                    </span>
                    <span>
                      {count} {count === 1 ? "booking" : "bookings"}
                    </span>
                  </div>

                  <div className="px-4">
                    {room.equipment.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {room.equipment.slice(0, 4).map((eq) => (
                          <Badge
                            key={eq}
                            variant="secondary"
                            className="capitalize"
                          >
                            {eq}
                          </Badge>
                        ))}
                        {room.equipment.length > 4 ? (
                          <Badge variant="outline">
                            +{room.equipment.length - 4}
                          </Badge>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-text-subtle">
                        No equipment listed
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 px-4">
                    <Button
                      size="sm"
                      onClick={() => openBook(room)}
                      disabled={room.status !== "available"}
                    >
                      <CalendarPlus aria-hidden="true" />
                      Book
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDetails(room)}
                    >
                      <Info aria-hidden="true" />
                      Details
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => openEdit(room)}
                      aria-label={`Edit room ${room.room_number}`}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-danger hover:text-danger"
                      onClick={() => openDelete(room)}
                      aria-label={`Delete room ${room.room_number}`}
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

      <RoomFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initial={editing}
        onSubmit={handleRoomSubmit}
      />
      <DeleteRoomDialog
        room={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteRoom}
      />
      <BookRoomDialog
        room={bookTarget}
        open={bookOpen}
        onOpenChange={setBookOpen}
        onSubmit={handleBooking}
      />
      <RoomDetailsDialog
        room={detailsTarget}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onCancelBooking={handleCancelBooking}
        refreshKey={detailsRefreshKey}
      />
      <FeedbackToaster items={items} onDismiss={dismiss} />
    </div>
  );
}

function RoomsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="gap-3">
          <div className="flex items-start justify-between px-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="px-4">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-1.5 px-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex gap-1.5 px-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}
