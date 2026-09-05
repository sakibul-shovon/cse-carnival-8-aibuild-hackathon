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
import { EventSchema } from "@/lib/validations/events";
import { timeToMinutes } from "@/lib/datetime";
import type { Event, EventStatus } from "@/types/database";

export type EventSubmitValues = {
  id: string;
  name: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  end_date: string;
  venue: string;
  organizer: string;
  capacity: number;
  registered: number;
  status: EventStatus;
};

type FormState = {
  id: string;
  name: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  end_date: string;
  venue: string;
  organizer: string;
  capacity: string;
  status: EventStatus;
};

const EMPTY: FormState = {
  id: "",
  name: "",
  description: "",
  date: "",
  start_time: "",
  end_time: "",
  end_date: "",
  venue: "",
  organizer: "",
  capacity: "",
  status: "upcoming",
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

export function EventFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: Event | null;
  onSubmit: (values: EventSubmitValues) => Promise<void>;
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
        name: initial.name,
        description: initial.description,
        date: initial.date,
        start_time: initial.start_time,
        end_time: initial.end_time,
        end_date: initial.end_date,
        venue: initial.venue,
        organizer: initial.organizer,
        capacity: String(initial.capacity),
        status: initial.status,
      });
    } else {
      setValues(EMPTY);
    }
  }, [open, mode, initial]);

  function setField(key: keyof FormState, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const registered = mode === "edit" && initial ? initial.registered : 0;
    const candidate = {
      id: values.id.trim(),
      name: values.name.trim(),
      description: values.description.trim(),
      date: values.date,
      start_time: values.start_time,
      end_time: values.end_time,
      end_date: values.end_date || values.date,
      venue: values.venue.trim(),
      organizer: values.organizer.trim(),
      capacity: Number(values.capacity),
      registered,
      status: values.status,
    };

    const result = EventSchema.safeParse(candidate);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    // Same-day time order check.
    if (
      candidate.date === candidate.end_date &&
      timeToMinutes(candidate.end_time) <= timeToMinutes(candidate.start_time)
    ) {
      setErrors({ end_time: "End time must be after start time." });
      return;
    }
    if (candidate.end_date < candidate.date) {
      setErrors({ end_date: "End date can't be before the start date." });
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
            {mode === "create" ? "Create event" : "Edit event"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new campus event."
              : "Update this event's details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {mode === "create" ? (
            <Field label="Event ID" error={errors.id}>
              <Input
                value={values.id}
                onChange={(e) => setField("id", e.target.value)}
                placeholder="e.g. evt-001"
                aria-invalid={!!errors.id}
                autoFocus
              />
            </Field>
          ) : null}

          <Field label="Name" error={errors.name}>
            <Input
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Guest Lecture: Deep Learning"
              aria-invalid={!!errors.name}
            />
          </Field>

          <Field label="Description" error={errors.description}>
            <textarea
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="What is this event about?"
              rows={3}
              aria-invalid={!!errors.description}
              className={cn(
                "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-text-subtle focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20"
              )}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date" error={errors.date}>
              <Input
                type="date"
                value={values.date}
                onChange={(e) => setField("date", e.target.value)}
                aria-invalid={!!errors.date}
              />
            </Field>
            <Field label="End date" error={errors.end_date}>
              <Input
                type="date"
                value={values.end_date}
                onChange={(e) => setField("end_date", e.target.value)}
                aria-invalid={!!errors.end_date}
              />
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
            <Field label="Venue" error={errors.venue}>
              <Input
                value={values.venue}
                onChange={(e) => setField("venue", e.target.value)}
                placeholder="e.g. 7C01"
                aria-invalid={!!errors.venue}
              />
            </Field>
            <Field label="Organizer" error={errors.organizer}>
              <Input
                value={values.organizer}
                onChange={(e) => setField("organizer", e.target.value)}
                placeholder="e.g. CSE Department"
                aria-invalid={!!errors.organizer}
              />
            </Field>
            <Field label="Capacity" error={errors.capacity}>
              <Input
                type="number"
                min={1}
                value={values.capacity}
                onChange={(e) => setField("capacity", e.target.value)}
                placeholder="60"
                aria-invalid={!!errors.capacity}
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
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
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
                  ? "Create event"
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
