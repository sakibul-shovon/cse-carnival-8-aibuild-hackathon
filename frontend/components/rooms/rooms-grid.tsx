import { Monitor, Users } from "lucide-react";
import type { Room } from "../../types/api";
import { titleCase } from "../../utils/format";
import { EmptyState } from "../shared/data-state";
import { Badge } from "../shared/ui/badge";

export function RoomsGrid({ rooms }: { rooms: Room[] }) {
  if (!rooms.length) return <EmptyState label="No rooms match this view" />;
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rooms.map((room) => (
    <article key={room.id} className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between"><div><h3 className="text-lg font-bold">{room.number}</h3><p className="text-sm text-muted-foreground">Floor {room.floor} · {titleCase(room.type)}</p></div><Badge className={room.status === "AVAILABLE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>{titleCase(room.status)}</Badge></div>
      <div className="mt-4 flex items-center gap-4 text-sm"><span className="flex items-center gap-1.5"><Users className="size-4 text-muted-foreground" />{room.capacity} seats</span><span className="flex items-center gap-1.5"><Monitor className="size-4 text-muted-foreground" />{room.features.length} features</span></div>
      <div className="mt-3 flex flex-wrap gap-1.5">{room.features.slice(0, 4).map((feature) => <Badge key={feature.id}>{titleCase(feature.name)}</Badge>)}</div>
    </article>
  ))}</div>;
}
