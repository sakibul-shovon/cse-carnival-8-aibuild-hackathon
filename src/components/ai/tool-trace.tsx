import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "cn";
import { actionLabel } from "@/lib/ai-labels";
import type { ToolEvent } from "@/types/ai";

// Renders the real actions the assistant performed (from backend toolEvents).
export function ToolTrace({ events }: { events: ToolEvent[] }) {
  if (events.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-col gap-1.5 border-t border-ai/15 pt-3">
      {events.map((event) => {
        const label = actionLabel(event.name);
        const Icon = label.icon;
        const failed = event.status === "failed";
        return (
          <li
            key={event.id}
            className="flex items-start gap-2 text-xs text-muted-foreground"
          >
            <Icon
              className="mt-0.5 size-3.5 shrink-0 text-ai-accent"
              aria-hidden="true"
            />
            <span className="font-medium text-foreground/80">{label.done}</span>
            {event.summary ? (
              <span className="min-w-0 flex-1 truncate text-text-subtle">
                {event.summary}
              </span>
            ) : null}
            {failed ? (
              <XCircle
                className="mt-0.5 size-3.5 shrink-0 text-danger"
                aria-label="Failed"
              />
            ) : (
              <CheckCircle2
                className={cn("mt-0.5 size-3.5 shrink-0 text-success")}
                aria-label="Completed"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
