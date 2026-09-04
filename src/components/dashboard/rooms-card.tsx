import { DoorOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { WidgetCard } from "./widget-card";
import type { RoomAvailability } from "@/lib/dashboard-selectors";

export function RoomsCard({ availability }: { availability: RoomAvailability }) {
  const rooms = availability.freeRooms.slice(0, 6);

  return (
    <WidgetCard
      title="Rooms Available Now"
      icon={DoorOpen}
      accent="text-room"
      viewAllHref="/rooms"
    >
      {availability.total === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No room data"
          description="Room availability will show here once rooms are added."
          className="border-0 bg-transparent py-8"
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {availability.availableNow}
            </span>{" "}
            of {availability.total} rooms free right now
          </p>
          {rooms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {rooms.map((room) => (
                <Badge
                  key={room.id}
                  className="bg-room/10 text-[color-mix(in_oklab,var(--room),black_20%)] dark:text-room"
                >
                  {room.room_number}
                  <span className="text-text-subtle">·{room.capacity}</span>
                </Badge>
              ))}
              {availability.availableNow > rooms.length ? (
                <Badge variant="outline">
                  +{availability.availableNow - rooms.length} more
                </Badge>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              All rooms are currently booked or unavailable.
            </p>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
