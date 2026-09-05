"use client";

import * as React from "react";
import { ClipboardList, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import {
  AssignmentStatusBadge,
  DeadlineBadge,
} from "@/components/status-badges";
import { FeedbackToaster, useFeedback } from "@/components/feedback-toaster";
import { daysFromToday, formatDate } from "@/lib/datetime";
import {
  createAssignment,
  deleteAssignment,
  fetchAssignments,
  updateAssignment,
} from "@/lib/data/assignments";
import type { Assignment } from "@/types/database";
import {
  AssignmentFormDialog,
  type AssignmentSubmitValues,
} from "./assignment-form-dialog";
import { DeleteAssignmentDialog } from "./delete-assignment-dialog";

type Status = "loading" | "ready" | "error";
const ALL = "__all__";

export function AssignmentsContent() {
  const [status, setStatus] = React.useState<Status>("loading");
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [search, setSearch] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState(ALL);
  const [statusFilter, setStatusFilter] = React.useState(ALL);

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<Assignment | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<Assignment | null>(
    null
  );
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const { items, notify, dismiss } = useFeedback();

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    try {
      const data = await fetchAssignments(signal);
      if (signal?.aborted) return;
      setAssignments(data);
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

  const courses = React.useMemo(() => {
    return Array.from(new Set(assignments.map((a) => a.course))).sort();
  }, [assignments]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...assignments]
      .filter((a) => (courseFilter === ALL ? true : a.course === courseFilter))
      .filter((a) => (statusFilter === ALL ? true : a.status === statusFilter))
      .filter((a) =>
        q === ""
          ? true
          : a.title.toLowerCase().includes(q) ||
            a.course.toLowerCase().includes(q) ||
            a.course_title.toLowerCase().includes(q)
      )
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [assignments, search, courseFilter, statusFilter]);

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(a: Assignment) {
    setFormMode("edit");
    setEditing(a);
    setFormOpen(true);
  }

  async function handleSubmit(values: AssignmentSubmitValues) {
    if (formMode === "create") {
      const created = await createAssignment(values);
      setAssignments((prev) => [...prev, created]);
      notify("success", `Added "${created.title}".`);
    } else if (editing) {
      const { id: _id, ...rest } = values;
      const updated = await updateAssignment(editing.id, rest);
      setAssignments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      notify("success", `Updated "${updated.title}".`);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    await deleteAssignment(target.id);
    setAssignments((prev) => prev.filter((a) => a.id !== target.id));
    notify("success", `Deleted "${target.title}".`);
  }

  const hasAny = assignments.length > 0;
  const isFiltering =
    courseFilter !== ALL || statusFilter !== ALL || search.trim() !== "";

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
              placeholder="Search assignment or course"
              className="pl-8 sm:w-60"
              aria-label="Search assignments"
            />
          </div>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="sm:w-40" aria-label="Filter by course">
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-36" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="late">Late</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden="true" />
          Add assignment
        </Button>
      </div>

      {status === "loading" ? (
        <AssignmentsSkeleton />
      ) : status === "error" ? (
        <ErrorState
          title="Couldn't load assignments"
          description="We couldn't reach the campus data service. Please try again."
          onRetry={() => load()}
        />
      ) : !hasAny ? (
        <EmptyState
          icon={ClipboardList}
          title="No assignments yet"
          description="Add the first assignment or deadline to get started."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Add assignment
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching assignments"
          description="No assignments match your current filters. Try adjusting them."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setCourseFilter(ALL);
                setStatusFilter(ALL);
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
            {filtered.length === 1 ? "assignment" : "assignments"}
            {isFiltering ? " (filtered)" : ""}
          </p>

          {/* Desktop table */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Marks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="max-w-[16rem]">
                        <div className="truncate font-medium">{a.title}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{a.course}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.course_title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="whitespace-nowrap text-sm">
                            {formatDate(a.deadline)}
                          </span>
                          {a.status === "pending" || a.status === "late" ? (
                            <DeadlineBadge daysLeft={daysFromToday(a.deadline)} />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.submission_platform}
                      </TableCell>
                      <TableCell>
                        <AssignmentStatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {a.marks}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((a) => (
              <Card key={a.id} size="sm" className="gap-2">
                <div className="flex items-start justify-between gap-2 px-4">
                  <div className="min-w-0">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.course} · {a.course_title}
                    </div>
                  </div>
                  <AssignmentStatusBadge status={a.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 px-4 text-sm text-muted-foreground">
                  <span>Due {formatDate(a.deadline)}</span>
                  {a.status === "pending" || a.status === "late" ? (
                    <DeadlineBadge daysLeft={daysFromToday(a.deadline)} />
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 text-xs text-muted-foreground">
                  <span>{a.submission_platform}</span>
                  <span>{a.marks} marks</span>
                </div>
                <div className="flex justify-end gap-1 px-4">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                    <Pencil aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger"
                    onClick={() => {
                      setDeleteTarget(a);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <AssignmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initial={editing}
        onSubmit={handleSubmit}
      />
      <DeleteAssignmentDialog
        assignment={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
      <FeedbackToaster items={items} onDismiss={dismiss} />
    </div>
  );
}

function AssignmentsSkeleton() {
  return (
    <Card className="p-0">
      <div className="flex flex-col divide-y divide-border-subtle">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}
