import { Calendar, MapPin, Users } from "lucide-react";
import type { CampusEvent } from "../../types/api";
import { formatDateTime, titleCase } from "../../utils/format";
import { EmptyState } from "../shared/data-state";
import { Badge } from "../shared/ui/badge";

export function EventsList({ events }: { events: CampusEvent[] }) {
  if (!events.length) return <EmptyState label="No campus events scheduled" />;
  return <div className="grid gap-3 lg:grid-cols-2">{events.map((event) => <article key={event.id} className="rounded-lg border bg-card p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-bold">{event.name}</h3><Badge>{titleCase(event.status)}</Badge></div><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{event.description}</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"><span className="flex items-center gap-1.5"><Calendar className="size-4 text-muted-foreground" />{formatDateTime(event.startsAt)}</span><span className="flex items-center gap-1.5"><MapPin className="size-4 text-muted-foreground" />{event.venueLabel}</span><span className="flex items-center gap-1.5"><Users className="size-4 text-muted-foreground" />{event._count.registrations}/{event.capacity}</span></div></article>)}</div>;
}
