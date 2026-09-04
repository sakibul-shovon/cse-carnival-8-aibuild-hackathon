import type { Announcement } from "../../types/api";
import { formatDateTime, titleCase } from "../../utils/format";
import { EmptyState } from "../shared/data-state";
import { Badge } from "../shared/ui/badge";

export function AnnouncementsList({ announcements }: { announcements: Announcement[] }) {
  if (!announcements.length) return <EmptyState label="No active announcements" />;
  return <div className="space-y-3">{announcements.map((item) => <article key={item.id} className="rounded-lg border bg-card p-5"><div className="flex flex-wrap items-center gap-2"><Badge className={item.priority === "HIGH" || item.priority === "URGENT" ? "bg-rose-50 text-rose-700" : undefined}>{titleCase(item.priority)}</Badge><span className="text-xs text-muted-foreground">Posted {formatDateTime(item.publishedAt)} by {item.postedBy}</span></div><h3 className="mt-3 font-bold">{item.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{item.body}</p></article>)}</div>;
}
