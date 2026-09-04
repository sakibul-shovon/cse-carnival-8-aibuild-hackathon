import { CheckCircle2, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { DeadlineBadge } from "@/components/status-badges";
import { WidgetCard } from "./widget-card";
import { daysFromToday, formatDate } from "@/lib/datetime";
import type { Assignment } from "@/lib/types";

export function DeadlinesCard({ assignments }: { assignments: Assignment[] }) {
  const items = assignments.slice(0, 5);

  return (
    <WidgetCard
      title="Assignment Deadlines"
      icon={ClipboardList}
      accent="text-assignment"
      viewAllHref="/assignments"
    >
      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing due"
          description="No pending deadlines. You're on top of things."
          className="border-0 bg-transparent py-8"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.course} · Due {formatDate(a.deadline)}
                </p>
              </div>
              <DeadlineBadge
                daysLeft={daysFromToday(a.deadline)}
                className="mt-0.5 shrink-0"
              />
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
