import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WidgetCard({
  title,
  icon: Icon,
  accent,
  viewAllHref,
  viewAllLabel = "View all",
  className,
  children,
}: {
  title: string;
  icon: LucideIcon;
  accent?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("gap-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={cn("size-4", accent)} aria-hidden="true" />
          {title}
        </CardTitle>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
          >
            {viewAllLabel}
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="pt-3">{children}</CardContent>
    </Card>
  );
}
