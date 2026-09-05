import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { AnnouncementPriority, AssignmentStatus } from "@/lib/types";

export function PriorityBadge({
  priority,
  className,
}: {
  priority: AnnouncementPriority;
  className?: string;
}) {
  const styles: Record<AnnouncementPriority, string> = {
    high: "bg-danger/10 text-danger",
    medium: "bg-warning/10 text-[color-mix(in_oklab,var(--warning),black_15%)] dark:text-warning",
    low: "bg-secondary text-muted-foreground",
  };
  return (
    <Badge className={cn(styles[priority], "capitalize", className)}>
      {priority}
    </Badge>
  );
}

export function DeadlineBadge({
  daysLeft,
  className,
}: {
  daysLeft: number;
  className?: string;
}) {
  let label: string;
  let tone: string;

  if (daysLeft < 0) {
    label = "Overdue";
    tone = "bg-danger/10 text-danger";
  } else if (daysLeft === 0) {
    label = "Due today";
    tone = "bg-danger/10 text-danger";
  } else if (daysLeft === 1) {
    label = "Due tomorrow";
    tone = "bg-warning/10 text-[color-mix(in_oklab,var(--warning),black_15%)] dark:text-warning";
  } else if (daysLeft <= 3) {
    label = `${daysLeft} days left`;
    tone = "bg-warning/10 text-[color-mix(in_oklab,var(--warning),black_15%)] dark:text-warning";
  } else {
    label = `${daysLeft} days left`;
    tone = "bg-secondary text-muted-foreground";
  }

  return <Badge className={cn(tone, className)}>{label}</Badge>;
}

export function AssignmentStatusBadge({
  status,
}: {
  status: AssignmentStatus;
}) {
  const styles: Record<AssignmentStatus, string> = {
    pending: "bg-info/10 text-info",
    submitted: "bg-success/10 text-success",
    graded: "bg-success/10 text-success",
    late: "bg-danger/10 text-danger",
  };
  return (
    <Badge className={cn(styles[status], "capitalize")}>{status}</Badge>
  );
}
