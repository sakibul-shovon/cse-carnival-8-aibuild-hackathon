"use client";

import * as React from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssignmentSchema } from "@/lib/validations/assignments";
import { toIsoDate } from "@/lib/datetime";
import type { Assignment, AssignmentStatus } from "@/types/database";

type FormState = {
  id: string;
  course: string;
  course_title: string;
  title: string;
  description: string;
  assigned_date: string;
  deadline: string;
  submission_platform: string;
  status: AssignmentStatus;
  marks: string;
};

export type AssignmentSubmitValues = {
  id: string;
  course: string;
  course_title: string;
  title: string;
  description: string;
  assigned_date: string;
  deadline: string;
  submission_platform: string;
  status: AssignmentStatus;
  marks: number;
};

const EMPTY: FormState = {
  id: "",
  course: "",
  course_title: "",
  title: "",
  description: "",
  assigned_date: "",
  deadline: "",
  submission_platform: "",
  status: "pending",
  marks: "",
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

export function AssignmentFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: Assignment | null;
  onSubmit: (values: AssignmentSubmitValues) => Promise<void>;
}) {
  const [values, setValues] = React.useState<FormState>(EMPTY);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError(null);
    if (mode === "edit" && initial) {
      setValues({
        id: initial.id,
        course: initial.course,
        course_title: initial.course_title,
        title: initial.title,
        description: initial.description,
        assigned_date: initial.assigned_date,
        deadline: initial.deadline,
        submission_platform: initial.submission_platform,
        status: initial.status,
        marks: String(initial.marks),
      });
    } else {
      setValues({ ...EMPTY, assigned_date: toIsoDate() });
    }
  }, [open, mode, initial]);

  function setField(key: keyof FormState, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const candidate = {
      id: values.id.trim(),
      course: values.course.trim(),
      course_title: values.course_title.trim(),
      title: values.title.trim(),
      description: values.description.trim(),
      assigned_date: values.assigned_date,
      deadline: values.deadline,
      submission_platform: values.submission_platform.trim(),
      status: values.status,
      marks: Number(values.marks),
    };

    const result = AssignmentSchema.safeParse(candidate);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (candidate.deadline < candidate.assigned_date) {
      setErrors({ deadline: "Deadline can't be before the assigned date." });
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(result.data);
      onOpenChange(false);
    } catch (err) {
      setFormError((err as Error).message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add assignment" : "Edit assignment"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new assignment or deadline."
              : "Update this assignment."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {mode === "create" ? (
            <Field label="Assignment ID" error={errors.id}>
              <Input
                value={values.id}
                onChange={(e) => setField("id", e.target.value)}
                placeholder="e.g. asgn-001"
                aria-invalid={!!errors.id}
                autoFocus
              />
            </Field>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Course code" error={errors.course}>
              <Input
                value={values.course}
                onChange={(e) => setField("course", e.target.value)}
                placeholder="e.g. CSE 4113"
                aria-invalid={!!errors.course}
              />
            </Field>
            <Field label="Course title" error={errors.course_title}>
              <Input
                value={values.course_title}
                onChange={(e) => setField("course_title", e.target.value)}
                placeholder="e.g. Pattern Recognition"
                aria-invalid={!!errors.course_title}
              />
            </Field>
          </div>

          <Field label="Assignment title" error={errors.title}>
            <Input
              value={values.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g. Assignment 1: Bayes Classifier"
              aria-invalid={!!errors.title}
            />
          </Field>

          <Field label="Description" error={errors.description}>
            <textarea
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Task details…"
              rows={3}
              aria-invalid={!!errors.description}
              className={cn(
                "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-text-subtle focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20"
              )}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Assigned date" error={errors.assigned_date}>
              <Input
                type="date"
                value={values.assigned_date}
                onChange={(e) => setField("assigned_date", e.target.value)}
                aria-invalid={!!errors.assigned_date}
              />
            </Field>
            <Field label="Deadline" error={errors.deadline}>
              <Input
                type="date"
                value={values.deadline}
                onChange={(e) => setField("deadline", e.target.value)}
                aria-invalid={!!errors.deadline}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Submission platform"
              error={errors.submission_platform}
              className="sm:col-span-1"
            >
              <Input
                value={values.submission_platform}
                onChange={(e) =>
                  setField("submission_platform", e.target.value)
                }
                placeholder="e.g. Google Classroom"
                aria-invalid={!!errors.submission_platform}
              />
            </Field>
            <Field label="Status" error={errors.status}>
              <Select
                value={values.status}
                onValueChange={(v) => setField("status", v)}
              >
                <SelectTrigger className="w-full" aria-invalid={!!errors.status}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Marks" error={errors.marks}>
              <Input
                type="number"
                min={0}
                value={values.marks}
                onChange={(e) => setField("marks", e.target.value)}
                placeholder="100"
                aria-invalid={!!errors.marks}
              />
            </Field>
          </div>

          {formError ? (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Add assignment"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-sm">{label}</Label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
