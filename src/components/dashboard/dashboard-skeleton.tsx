import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-16" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="size-5 rounded-md" />
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <WidgetSkeleton rows={3} />
        <WidgetSkeleton rows={3} />
        <WidgetSkeleton rows={4} />
        <WidgetSkeleton rows={3} />
        <WidgetSkeleton rows={2} />
      </div>
    </div>
  );
}
