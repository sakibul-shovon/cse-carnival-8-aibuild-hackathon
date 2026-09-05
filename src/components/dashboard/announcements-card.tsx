import { Megaphone } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PriorityBadge } from "@/components/status-badges";
import { WidgetCard } from "./widget-card";
import { relativeDayLabel } from "@/lib/datetime";
import type { Announcement } from "@/lib/types";

export function AnnouncementsCard({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const items = announcements.slice(0, 4);

  return (
    <WidgetCard
      title="Announcements"
      icon={Megaphone}
      accent="text-announcement"
      viewAllHref="/announcements"
    >
      {items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No active announcements"
          description="You're all caught up. New notices will show here."
          className="border-0 bg-transparent py-8"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {items.map((a) => (
            <li key={a.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium leading-snug">{a.title}</span>
                <PriorityBadge priority={a.priority} className="mt-0.5 shrink-0" />
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {a.body}
              </p>
              <div className="flex items-center gap-2 text-xs text-text-subtle">
                <span>{a.posted_by}</span>
                <span aria-hidden="true">·</span>
                <span>{relativeDayLabel(a.date)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
