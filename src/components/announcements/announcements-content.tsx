"use client";

import * as React from "react";
import { Megaphone, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PriorityBadge } from "@/components/status-badges";
import { FeedbackToaster, useFeedback } from "@/components/feedback-toaster";
import { daysFromToday, formatDate, relativeDayLabel } from "@/lib/datetime";
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement,
} from "@/lib/data/announcements";
import type { Announcement } from "@/types/database";
import {
  AnnouncementFormDialog,
  type AnnouncementSubmitValues,
} from "./announcement-form-dialog";
import { DeleteAnnouncementDialog } from "./delete-announcement-dialog";

type Status = "loading" | "ready" | "error";
const ALL = "__all__";
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

function isExpired(a: Announcement): boolean {
  return daysFromToday(a.expires) < 0;
}

export function AnnouncementsContent() {
  const [status, setStatus] = React.useState<Status>("loading");
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [search, setSearch] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState(ALL);
  const [stateFilter, setStateFilter] = React.useState(ALL);

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<Announcement | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<Announcement | null>(
    null
  );
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const { items, notify, dismiss } = useFeedback();

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    try {
      const data = await fetchAnnouncements(signal);
      if (signal?.aborted) return;
      setAnnouncements(data);
      setStatus("ready");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...announcements]
      .filter((a) =>
        priorityFilter === ALL ? true : a.priority === priorityFilter
      )
      .filter((a) => {
        if (stateFilter === ALL) return true;
        return stateFilter === "expired" ? isExpired(a) : !isExpired(a);
      })
      .filter((a) =>
        q === ""
          ? true
          : a.title.toLowerCase().includes(q) ||
            a.body.toLowerCase().includes(q) ||
            a.posted_by.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const ax = isExpired(a) ? 1 : 0;
        const bx = isExpired(b) ? 1 : 0;
        if (ax !== bx) return ax - bx;
        const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (p !== 0) return p;
        return b.date.localeCompare(a.date);
      });
  }, [announcements, search, priorityFilter, stateFilter]);

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(a: Announcement) {
    setFormMode("edit");
    setEditing(a);
    setFormOpen(true);
  }

  async function handleSubmit(values: AnnouncementSubmitValues) {
    if (formMode === "create") {
      const created = await createAnnouncement(values);
      setAnnouncements((prev) => [...prev, created]);
      notify("success", `Posted "${created.title}".`);
    } else if (editing) {
      const { id: _id, ...rest } = values;
      const updated = await updateAnnouncement(editing.id, rest);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      notify("success", `Updated "${updated.title}".`);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    await deleteAnnouncement(target.id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== target.id));
    notify("success", `Deleted "${target.title}".`);
  }

  const hasAny = announcements.length > 0;
  const isFiltering =
    priorityFilter !== ALL || stateFilter !== ALL || search.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search announcements"
              className="pl-8 sm:w-60"
              aria-label="Search announcements"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="sm:w-36" aria-label="Filter by priority">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="sm:w-36" aria-label="Filter by state">
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All states</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden="true" />
          Post announcement
        </Button>
      </div>

      {status === "loading" ? (
        <AnnouncementsSkeleton />
      ) : status === "error" ? (
        <ErrorState
          title="Couldn't load announcements"
          description="We couldn't reach the campus data service. Please try again."
          onRetry={() => load()}
        />
      ) : !hasAny ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Post the first notice to the campus board."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Post announcement
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching announcements"
          description="No announcements match your current filters. Try adjusting them."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setPriorityFilter(ALL);
                setStateFilter(ALL);
                setSearch("");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {filtered.length}{" "}
            {filtered.length === 1 ? "announcement" : "announcements"}
            {isFiltering ? " (filtered)" : ""}
          </p>
          <div className="flex flex-col gap-3">
            {filtered.map((a) => {
              const expired = isExpired(a);
              return (
                <Card key={a.id} className="gap-2">
                  <div className="flex items-start justify-between gap-3 px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{a.title}</span>
                      <PriorityBadge priority={a.priority} />
                      {expired ? (
                        <Badge variant="secondary" className="text-text-subtle">
                          Expired
                        </Badge>
                      ) : (
                        <Badge className="bg-success/10 text-success">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(a)}
                        aria-label={`Edit ${a.title}`}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-danger hover:text-danger"
                        onClick={() => {
                          setDeleteTarget(a);
                          setDeleteOpen(true);
                        }}
                        aria-label={`Delete ${a.title}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  <p className="px-4 text-sm text-muted-foreground">{a.body}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 text-xs text-text-subtle">
                    <span>{a.posted_by}</span>
                    <span aria-hidden="true">·</span>
                    <span>Posted {relativeDayLabel(a.date)}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {expired
                        ? `Expired ${formatDate(a.expires)}`
                        : `Expires ${formatDate(a.expires)}`}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <AnnouncementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initial={editing}
        onSubmit={handleSubmit}
      />
      <DeleteAnnouncementDialog
        announcement={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
      <FeedbackToaster items={items} onDismiss={dismiss} />
    </div>
  );
}

function AnnouncementsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="gap-2">
          <div className="flex items-center justify-between px-4">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-7 w-16" />
          </div>
          <div className="px-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-1.5 h-4 w-2/3" />
          </div>
          <div className="px-4">
            <Skeleton className="h-3 w-40" />
          </div>
        </Card>
      ))}
    </div>
  );
}
