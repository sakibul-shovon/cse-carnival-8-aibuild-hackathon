"use client";

import * as React from "react";
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
import { ScheduleSchema } from "@/lib/validations/schedules";
import { WEEK_DAYS } from "@/lib/datetime";
import { timeToMinutes } from "@/lib/datetime";
import type { Schedule } from "@/lib/types";

export type ScheduleFormValues = {
  id: string;
  course: string;
  title: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  instructor: string;
  section: string;
};

const EMPTY: ScheduleFormValues = {
  id: "",
  course: "",
  title: "",
  day: "",
  start_time: "",
  end_time: "",
  room: "",
  instructor: "",
  section: "",
};

// Client-side validation reuses the backend Zod schema, plus a time-order rule.
const FormSchema = ScheduleSchema.refine(
  (v) => timeToMinutes(v.end_time) > timeToMinutes(v.start_time),
  { message: "End time must be after start time.", path: ["end_time"] }
);

type FieldErrors = Partial<Record<keyof ScheduleFormValues, string>>;

export function ScheduleFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: Schedule | null;
  onSubmit: (values: ScheduleFormValues) => Promise<void>;
}) {
  const [values, setValues] = React.useState<ScheduleFormValues>(EMPTY);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError(null);
    if (mode === "edit" && initial) {
      setValues({ ...initial });
    } else {
      setValues(EMPTY);
    }
  }, [open, mode, initial]);

  function setField(key: keyof ScheduleFormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const result = FormSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ScheduleFormValues;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add class" : "Edit class"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new class to the weekly schedule."
              : "Update the details for this class."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {mode === "create" ? (
            <Field label="Schedule ID" error={errors.id}>
              <Input
                value={values.id}
                onChange={(e) => setField("id", e.target.value)}
                placeholder="e.g. sch-001"
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
            <Field label="Section" error={errors.section}>
              <Input
                value={values.section}
                onChange={(e) => setField("section", e.target.value)}
                placeholder="e.g. B1"
                aria-invalid={!!errors.section}
              />
            </Field>
          </div>

          <Field label="Course title" error={errors.title}>
            <Input
              value={values.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g. Pattern Recognition and Machine Learning"
              aria-invalid={!!errors.title}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Day" error={errors.day}>
              <Select
                value={values.day}
                onValueChange={(v) => setField("day", v)}
              >
                <SelectTrigger aria-invalid={!!errors.day} className="w-full">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_DAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Start time" error={errors.start_time}>
              <Input
                type="time"
                value={values.start_time}
                onChange={(e) => setField("start_time", e.target.value)}
                aria-invalid={!!errors.start_time}
              />
            </Field>
            <Field label="End time" error={errors.end_time}>
              <Input
                type="time"
                value={values.end_time}
                onChange={(e) => setField("end_time", e.target.value)}
                aria-invalid={!!errors.end_time}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Room" error={errors.room}>
              <Input
                value={values.room}
                onChange={(e) => setField("room", e.target.value)}
                placeholder="e.g. 7A03"
                aria-invalid={!!errors.room}
              />
            </Field>
            <Field label="Instructor" error={errors.instructor}>
              <Input
                value={values.instructor}
                onChange={(e) => setField("instructor", e.target.value)}
                placeholder="e.g. Dr. Jane Doe or TBA"
                aria-invalid={!!errors.instructor}
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
                  ? "Add class"
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
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export type { FieldErrors };
