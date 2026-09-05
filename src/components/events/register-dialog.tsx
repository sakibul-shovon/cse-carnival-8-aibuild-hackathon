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
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/types/database";

export type RegistrationFormValues = { student_id: string; name: string };

type FieldErrors = Partial<Record<keyof RegistrationFormValues, string>>;

export function RegisterDialog({
  event,
  open,
  onOpenChange,
  onSubmit,
}: {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RegistrationFormValues) => Promise<void>;
}) {
  const [values, setValues] = React.useState<RegistrationFormValues>({
    student_id: "",
    name: "",
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
      const m = (user?.user_metadata ?? {}) as {
        name?: string;
        student_id?: string;
      };
      setErrors({});
      setFormError(null);
      setValues({ student_id: m.student_id ?? "", name: m.name ?? "" });
    });
    return () => {
      active = false;
    };
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const fieldErrors: FieldErrors = {};
    if (!values.student_id.trim())
      fieldErrors.student_id = "Student ID is required.";
    if (!values.name.trim()) fieldErrors.name = "Name is required.";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      // Backend enforces capacity/full, cancelled, completed and duplicate rules.
      await onSubmit({
        student_id: values.student_id.trim(),
        name: values.name.trim(),
      });
      onOpenChange(false);
    } catch (err) {
      setFormError((err as Error).message || "Could not register.");
    } finally {
      setSubmitting(false);
    }
  }

  const remaining = event ? Math.max(0, event.capacity - event.registered) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {event ? `Register for ${event.name}` : "Register"}
          </DialogTitle>
          <DialogDescription>
            {event
              ? `${event.registered}/${event.capacity} registered · ${remaining} spot${remaining === 1 ? "" : "s"} left.`
              : "Reserve a spot for this event."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Student ID</Label>
            <Input
              value={values.student_id}
              readOnly
              className="bg-muted text-muted-foreground"
              aria-invalid={!!errors.student_id}
            />
            {errors.student_id ? (
              <p className="text-xs text-danger">{errors.student_id}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Full name</Label>
            <Input
              value={values.name}
              readOnly
              className="bg-muted text-muted-foreground"
              aria-invalid={!!errors.name}
            />
            {errors.name ? (
              <p className="text-xs text-danger">{errors.name}</p>
            ) : null}
          </div>

          <p className="text-xs text-text-subtle">
            Registering as the signed-in student.
          </p>

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
              {submitting ? "Registering…" : "Register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
