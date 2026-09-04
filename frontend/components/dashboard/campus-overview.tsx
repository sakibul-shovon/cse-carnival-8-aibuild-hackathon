import { ArrowRight, CalendarDays, ClipboardList, Megaphone } from "lucide-react";
import type { DashboardData } from "../../types/api";
import { formatDateTime, titleCase } from "../../utils/format";
import { ScheduleList } from "../schedule/schedule-list";
import { Badge } from "../shared/ui/badge";
import { Button } from "../shared/ui/button";
import type { DashboardView } from "./app-shell";
import { StatStrip } from "./stat-strip";

function SectionTitle({ icon: Icon, title, action, onAction }: { icon: typeof CalendarDays; title: string; action: string; onAction: () => void }) {
  return <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Icon className="size-4 text-primary" />{title}</h2><Button type="button" variant="ghost" size="sm" onClick={onAction}>{action}<ArrowRight className="size-4" /></Button></div>;
}

export function CampusOverview({ data, onViewChange }: { data: DashboardData; onViewChange: (view: DashboardView) => void }) {
  return <div className="space-y-6">
    <StatStrip data={data} />
    <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
      <section className="rounded-lg border bg-card p-5"><SectionTitle icon={CalendarDays} title="Weekly schedule" action="Full schedule" onAction={() => onViewChange("schedule")} /><ScheduleList schedules={data.schedules} compact /></section>
      <section className="rounded-lg border bg-card p-5"><SectionTitle icon={ClipboardList} title="Upcoming assignments" action="View all" onAction={() => onViewChange("assignments")} /><div className="divide-y">{data.assignments.slice(0, 5).map((item) => <article key={item.id} className="py-3 first:pt-0"><div className="flex gap-3"><Badge className="h-fit shrink-0">{item.course.code}</Badge><div className="min-w-0"><p className="truncate text-sm font-semibold" title={item.title}>{item.title}</p><p className="mt-1 text-xs text-muted-foreground">Due {formatDateTime(item.dueAt)}</p></div></div></article>)}</div></section>
    </div>
    <section className="rounded-lg border bg-card p-5"><SectionTitle icon={Megaphone} title="Latest announcements" action="View all" onAction={() => onViewChange("announcements")} /><div className="grid gap-4 md:grid-cols-2">{data.announcements.slice(0, 4).map((item) => <article key={item.id} className="border-l-2 border-primary pl-4"><div className="flex items-center gap-2"><Badge className={item.priority === "HIGH" || item.priority === "URGENT" ? "bg-rose-50 text-rose-700" : undefined}>{titleCase(item.priority)}</Badge><span className="text-xs text-muted-foreground">{formatDateTime(item.publishedAt)}</span></div><h3 className="mt-2 font-semibold">{item.title}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</p></article>)}</div></section>
  </div>;
}
