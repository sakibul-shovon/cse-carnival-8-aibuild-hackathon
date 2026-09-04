import { RefreshCw } from "lucide-react";
import { Button } from "../shared/ui/button";
import { NotificationCenter } from "../shared/notification-center";

export function PageHeader({ title, description, onRefresh, isRefreshing }: { title: string; description: string; onRefresh: () => void; isRefreshing: boolean }) {
  return (
    <header className="flex flex-col gap-4 border-b bg-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div><h1 className="text-xl font-bold sm:text-2xl">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      <div className="flex items-center gap-2"><NotificationCenter /><Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}><RefreshCw className={isRefreshing ? "size-4 animate-spin" : "size-4"} /> Refresh</Button></div>
    </header>
  );
}
