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
import { AnnouncementSchema } from "@/lib/validations/announcements";
import { toIsoDate } from "@/lib/datetime";
import type { Announcement, AnnouncementPriority } from "@/types/database";

type FormState = {
  id: string;
  title: string;
  body: string;
  date: string;
  priority: AnnouncementPriority;
  posted_by: string;
  expires: string;
};

export type AnnouncementSubmitValues = FormState;

const EMPTY: FormState = {
  id: "",
  title: "",
  body: "",
  date: "",
  priority: "medium",
  posted_by: "",
  expires: "",
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

export function AnnouncementFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: Announcement | null;
  onSubmit: (values: AnnouncementSubmitValues) => Promise<void>;
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
        title: initial.title,
        body: initial.body,
        date: initial.date,
        priority: initial.priority,
        posted_by: initial.posted_by,
        expires: initial.expires,
      });
    } else {
      setValues({ ...EMPTY, date: toIsoDate() });
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
      title: values.title.trim(),
      body: values.body.trim(),
      date: values.date,
      priority: values.priority,
      posted_by: values.posted_by.trim(),
      expires: values.expires,
    };

    const result = AnnouncementSchema.safeParse(candidate);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (candidate.expires < candidate.date) {
      setErrors({ expires: "Expiry can't be before the posted date." });
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
            {mode === "create" ? "Post announcement" : "Edit announcement"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Publish a new notice to the campus board."
              : "Update this announcement."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {mode === "create" ? (
            <Field label="Announcement ID" error={errors.id}>
              <Input
                value={values.id}
                onChange={(e) => setField("id", e.target.value)}
                placeholder="e.g. ann-001"
                aria-invalid={!!errors.id}
                autoFocus
              />
            </Field>
          ) : null}

          <Field label="Title" error={errors.title}>
            <Input
              value={values.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g. Library closed on Friday"
              aria-invalid={!!errors.title}
            />
          </Field>

          <Field label="Body" error={errors.body}>
            <textarea
              value={values.body}
              onChange={(e) => setField("body", e.target.value)}
              placeholder="Full announcement text…"
              rows={4}
              aria-invalid={!!errors.body}
              className={cn(
                "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-text-subtle focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20"
              )}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Priority" error={errors.priority}>
              <Select
                value={values.priority}
                onValueChange={(v) => setField("priority", v)}
              >
                <SelectTrigger
                  className="w-full"
                  aria-invalid={!!errors.priority}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Posted date" error={errors.date}>
              <Input
                type="date"
                value={values.date}
                onChange={(e) => setField("date", e.target.value)}
                aria-invalid={!!errors.date}
              />
            </Field>
            <Field label="Expires" error={errors.expires}>
              <Input
                type="date"
                value={values.expires}
                onChange={(e) => setField("expires", e.target.value)}
                aria-invalid={!!errors.expires}
              />
            </Field>
          </div>

          <Field label="Posted by" error={errors.posted_by}>
            <Input
              value={values.posted_by}
              onChange={(e) => setField("posted_by", e.target.value)}
              placeholder="e.g. Registrar's Office"
              aria-invalid={!!errors.posted_by}
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
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Post announcement"
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
