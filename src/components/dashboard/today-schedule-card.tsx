import { CalendarDays, Clock, MapPin, User } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { WidgetCard } from "./widget-card";
import { formatTimeRange } from "@/lib/datetime";
import type { Schedule } from "@/lib/types";

export function TodayScheduleCard({
  classes,
  nextClassId,
}: {
  classes: Schedule[];
  nextClassId: string | null;
}) {
  return (
    <WidgetCard
      title="Today's Schedule"
      icon={CalendarDays}
      accent="text-schedule"
      viewAllHref="/schedule"
    >
      {classes.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No classes today"
          description="Enjoy the free day, or check the full weekly schedule."
          className="border-0 bg-transparent py-8"
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {classes.map((cls) => {
            const isNext = cls.id === nextClassId;
            return (
              <li
                key={cls.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-border-subtle p-3",
                  isNext && "border-schedule/30 bg-schedule/5"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{cls.course}</span>
                    {isNext ? (
                      <Badge className="bg-schedule/10 text-schedule">
                        Up next
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {cls.title}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" aria-hidden="true" />
                      {formatTimeRange(cls.start_time, cls.end_time)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" aria-hidden="true" />
                      {cls.room}
                    </span>
                    {cls.instructor && cls.instructor !== "TBA" ? (
                      <span className="flex items-center gap-1">
                        <User className="size-3" aria-hidden="true" />
                        {cls.instructor}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
