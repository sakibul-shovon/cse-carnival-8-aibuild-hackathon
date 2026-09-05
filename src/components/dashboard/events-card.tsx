import { Clock, MapPin, PartyPopper, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { WidgetCard } from "./widget-card";
import { formatTime, relativeDayLabel } from "@/lib/datetime";
import type { CampusEvent } from "@/lib/types";

export function EventsCard({ events }: { events: CampusEvent[] }) {
  const items = events.slice(0, 4);

  return (
    <WidgetCard
      title="Upcoming Events"
      icon={PartyPopper}
      accent="text-event"
      viewAllHref="/events"
    >
      {items.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="No upcoming events"
          description="Nothing scheduled right now. Check back soon."
          className="border-0 bg-transparent py-8"
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((e) => {
            const isFull = e.status === "full" || e.registered >= e.capacity;
            return (
              <li
                key={e.id}
                className="flex flex-col gap-1 rounded-lg border border-border-subtle p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium leading-snug">{e.name}</span>
                  <Badge className="shrink-0 bg-event/10 text-[color-mix(in_oklab,var(--event),black_15%)] dark:text-event">
                    {relativeDayLabel(e.date)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" aria-hidden="true" />
                    {formatTime(e.start_time)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" aria-hidden="true" />
                    {e.venue}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3" aria-hidden="true" />
                    {isFull ? "Full" : `${e.registered}/${e.capacity}`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
