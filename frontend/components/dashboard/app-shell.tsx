import { Bell, Bot, Building2, CalendarDays, ClipboardList, LayoutDashboard, Megaphone } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export type DashboardView = "overview" | "schedule" | "rooms" | "events" | "assignments" | "announcements" | "assistant";
const navigation = [
  ["overview", "Overview", LayoutDashboard], ["schedule", "Schedule", CalendarDays], ["rooms", "Rooms", Building2],
  ["events", "Events", Bell], ["assignments", "Assignments", ClipboardList], ["announcements", "Announcements", Megaphone],
  ["assistant", "AI assistant", Bot]
] as const;

export function AppShell({ activeView, onViewChange, children }: { activeView: DashboardView; onViewChange: (view: DashboardView) => void; children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b bg-card lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-3 px-5 lg:h-20">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">CO</span>
          <div><p className="font-bold">CampusOS</p><p className="text-xs text-muted-foreground">AUST · Fall 2026</p></div>
        </div>
        <nav aria-label="Dashboard navigation" className="scrollbar-thin flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible">
          {navigation.map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => onViewChange(id)} aria-current={activeView === id ? "page" : undefined}
              className={cn("flex min-h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors lg:w-full", activeView === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <Icon className="size-4" /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="mx-4 mt-auto hidden border-t py-5 lg:block"><p className="text-xs text-muted-foreground">Signed in as</p><p className="mt-1 text-sm font-semibold">Sakibul Hassan</p><p className="text-xs text-muted-foreground">20-40532</p></div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
