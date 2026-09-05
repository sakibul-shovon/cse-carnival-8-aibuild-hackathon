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
import { toIsoDate } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/types/database";

export type BookingFormValues = {
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  booked_by: string;
};

type FieldErrors = Partial<Record<keyof BookingFormValues, string>>;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function BookRoomDialog({
  room,
  open,
  onOpenChange,
  onSubmit,
}: {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BookingFormValues) => Promise<void>;
}) {
  const [values, setValues] = React.useState<BookingFormValues>({
    date: "",
    start_time: "",
    end_time: "",
    purpose: "",
    booked_by: "",
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      const m = (user?.user_metadata ?? {}) as { name?: string };
      setErrors({});
      setFormError(null);
      setValues({
        date: toIsoDate(),
        start_time: "",
        end_time: "",
        purpose: "",
        booked_by: m.name ?? "",
      });
    });
    return () => {
      active = false;
    };
  }, [open]);

  function setField(key: keyof BookingFormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // Basic input validation only. Conflict/overlap checks are enforced by the backend.
  function validate(): boolean {
    const e: FieldErrors = {};
    if (!values.date) e.date = "Date is required.";
    if (!TIME_RE.test(values.start_time))
      e.start_time = "Enter a valid start time.";
    if (!TIME_RE.test(values.end_time)) e.end_time = "Enter a valid end time.";
    if (
      TIME_RE.test(values.start_time) &&
      TIME_RE.test(values.end_time) &&
      values.end_time <= values.start_time
    ) {
      e.end_time = "End time must be after start time.";
    }
    if (!values.purpose.trim()) e.purpose = "Purpose is required.";
    if (!values.booked_by.trim()) e.booked_by = "Please enter who is booking.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        date: values.date,
        start_time: values.start_time,
        end_time: values.end_time,
        purpose: values.purpose.trim(),
        booked_by: values.booked_by.trim(),
      });
      onOpenChange(false);
    } catch (err) {
      // Surfaces backend validation / conflict messages.
      setFormError((err as Error).message || "Could not book the room.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {room ? `Book room ${room.room_number}` : "Book room"}
          </DialogTitle>
          <DialogDescription>
            {room
              ? `Capacity ${room.capacity} · ${room.type}. The booking is confirmed only after the backend verifies there's no conflict.`
              : "Reserve this room for a time slot."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Date" error={errors.date}>
            <Input
              type="date"
              value={values.date}
              onChange={(e) => setField("date", e.target.value)}
              aria-invalid={!!errors.date}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <Field label="Purpose" error={errors.purpose}>
            <Input
              value={values.purpose}
              onChange={(e) => setField("purpose", e.target.value)}
              placeholder="e.g. Project meeting"
              aria-invalid={!!errors.purpose}
            />
          </Field>

          <Field label="Booked by" error={errors.booked_by}>
            <Input
              value={values.booked_by}
              readOnly
              className="bg-muted text-muted-foreground"
              aria-invalid={!!errors.booked_by}
            />
          </Field>

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
              {submitting ? "Booking…" : "Book room"}
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
