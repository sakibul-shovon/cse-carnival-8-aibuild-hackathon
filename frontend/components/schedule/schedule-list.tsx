import { Clock3, MapPin } from "lucide-react";
import type { Schedule } from "../../types/api";
import { formatTime, titleCase } from "../../utils/format";
import { EmptyState } from "../shared/data-state";
import { Badge } from "../shared/ui/badge";

export function ScheduleList({ schedules, compact = false }: { schedules: Schedule[]; compact?: boolean }) {
  if (!schedules.length) return <EmptyState label="No classes in this view" />;
  return <div className="divide-y">{schedules.slice(0, compact ? 5 : undefined).map((item) => (
    <article key={item.id} className="grid gap-2 py-4 first:pt-0 sm:grid-cols-[130px_1fr_auto] sm:items-center">
      <div><p className="text-sm font-semibold">{titleCase(item.dayOfWeek)}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3.5" />{formatTime(item.startTime)}–{formatTime(item.endTime)}</p></div>
      <div><p className="font-semibold">{item.course.code} · {item.course.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.instructor} · Section {item.section}</p></div>
      <Badge className="w-fit"><MapPin className="mr-1 size-3" />{item.room.number}</Badge>
    </article>
  ))}</div>;
}
