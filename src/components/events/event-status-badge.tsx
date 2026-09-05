import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { EventStatus } from "@/types/database";

const STYLES: Record<EventStatus, string> = {
  upcoming: "bg-info/10 text-info",
  ongoing: "bg-success/10 text-success",
  completed: "bg-secondary text-muted-foreground",
  cancelled: "bg-danger/10 text-danger",
  full: "bg-warning/10 text-[color-mix(in_oklab,var(--warning),black_15%)] dark:text-warning",
};

export function EventStatusBadge({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  return (
    <Badge className={cn(STYLES[status], "capitalize", className)}>
      {status}
    </Badge>
  );
}
