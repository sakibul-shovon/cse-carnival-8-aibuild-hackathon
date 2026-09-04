import { Building2, CalendarCheck, ClipboardCheck, Megaphone } from "lucide-react";
import type { DashboardData } from "../../types/api";

export function StatStrip({ data }: { data: DashboardData }) {
  const stats = [
    ["Classes", data.schedules.length, "Weekly schedule", CalendarCheck, "text-blue-700 bg-blue-50"],
    ["Available rooms", data.rooms.filter((room) => room.status === "AVAILABLE").length, `${data.rooms.length} total spaces`, Building2, "text-emerald-700 bg-emerald-50"],
    ["Assignments", data.assignments.filter((item) => item.submissions?.[0]?.status !== "SUBMITTED").length, "Need attention", ClipboardCheck, "text-amber-700 bg-amber-50"],
    ["Announcements", data.announcements.length, "Currently active", Megaphone, "text-rose-700 bg-rose-50"]
  ] as const;
  return <section aria-label="Campus summary" className="grid divide-y rounded-lg border bg-card sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
    {stats.map(([label, value, detail, Icon, color]) => <div key={label} className="flex items-center gap-4 p-4 lg:p-5"><span className={`flex size-10 items-center justify-center rounded-md ${color}`}><Icon className="size-5" /></span><div><p className="text-2xl font-bold tabular-nums">{value}</p><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{detail}</p></div></div>)}
  </section>;
}
