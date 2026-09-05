import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { RoomStatus } from "@/types/database";

export function RoomStatusBadge({
  status,
  className,
}: {
  status: RoomStatus;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        status === "available"
          ? "bg-success/10 text-success"
          : "bg-secondary text-muted-foreground",
        "capitalize",
        className
      )}
    >
      {status}
    </Badge>
  );
}
