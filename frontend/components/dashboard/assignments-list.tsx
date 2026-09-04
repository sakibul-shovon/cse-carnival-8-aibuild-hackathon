import { Clock3 } from "lucide-react";
import type { Assignment } from "../../types/api";
import { formatDateTime, titleCase } from "../../utils/format";
import { EmptyState } from "../shared/data-state";
import { Badge } from "../shared/ui/badge";

export function AssignmentsList({ assignments }: { assignments: Assignment[] }) {
  if (!assignments.length) return <EmptyState label="No assignments due" />;
  return <div className="overflow-hidden rounded-lg border bg-card"><div className="divide-y">{assignments.map((item) => { const status = item.submissions?.[0]?.status ?? "PENDING"; return <article key={item.id} className="grid gap-3 p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center"><Badge className="w-fit">{item.course.code}</Badge><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock3 className="size-4" />Due {formatDateTime(item.dueAt)} · {item.marks} marks</p></div><Badge className={status === "SUBMITTED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>{titleCase(status)}</Badge></article>; })}</div></div>;
}
