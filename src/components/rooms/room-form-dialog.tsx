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
import { RoomSchema } from "@/lib/validations/rooms";
import type { Room, RoomStatus, RoomType } from "@/types/database";

export type RoomFormValues = {
  id: string;
  room_number: string;
  type: RoomType;
  capacity: string;
  equipment: string;
  floor: string;
  status: RoomStatus;
};

const EMPTY: RoomFormValues = {
  id: "",
  room_number: "",
  type: "classroom",
  capacity: "",
  equipment: "",
  floor: "",
  status: "available",
};

type FieldErrors = Partial<Record<keyof RoomFormValues, string>>;

export type RoomSubmitValues = {
  id: string;
  room_number: string;
  type: RoomType;
  capacity: number;
  equipment: string[];
  floor: number;
  status: RoomStatus;
};

export function RoomFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: Room | null;
  onSubmit: (values: RoomSubmitValues) => Promise<void>;
}) {
  const [values, setValues] = React.useState<RoomFormValues>(EMPTY);
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
        room_number: initial.room_number,
        type: initial.type,
        capacity: String(initial.capacity),
        equipment: initial.equipment.join(", "),
        floor: String(initial.floor),
        status: initial.status,
      });
    } else {
      setValues(EMPTY);
    }
  }, [open, mode, initial]);

  function setField(key: keyof RoomFormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const candidate = {
      id: values.id.trim(),
      room_number: values.room_number.trim(),
      type: values.type,
      capacity: Number(values.capacity),
      equipment: values.equipment
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      floor: Number(values.floor),
      status: values.status,
    };

    const result = RoomSchema.safeParse(candidate);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof RoomFormValues;
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
          <DialogTitle>{mode === "create" ? "Add room" : "Edit room"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new room to the directory."
              : "Update this room's details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {mode === "create" ? (
            <Field label="Room ID" error={errors.id}>
              <Input
                value={values.id}
                onChange={(e) => setField("id", e.target.value)}
                placeholder="e.g. room-001"
                aria-invalid={!!errors.id}
                autoFocus
              />
            </Field>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Room number" error={errors.room_number}>
              <Input
                value={values.room_number}
                onChange={(e) => setField("room_number", e.target.value)}
                placeholder="e.g. 7A03"
                aria-invalid={!!errors.room_number}
              />
            </Field>
            <Field label="Type" error={errors.type}>
              <Select
                value={values.type}
                onValueChange={(v) => setField("type", v)}
              >
                <SelectTrigger className="w-full" aria-invalid={!!errors.type}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classroom">Classroom</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="seminar">Seminar</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Capacity" error={errors.capacity}>
              <Input
                type="number"
                min={1}
                value={values.capacity}
                onChange={(e) => setField("capacity", e.target.value)}
                placeholder="40"
                aria-invalid={!!errors.capacity}
              />
            </Field>
            <Field label="Floor" error={errors.floor}>
              <Input
                type="number"
                value={values.floor}
                onChange={(e) => setField("floor", e.target.value)}
                placeholder="7"
                aria-invalid={!!errors.floor}
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
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label="Equipment"
            error={errors.equipment}
            hint="Comma-separated, e.g. projector, AC, whiteboard"
          >
            <Input
              value={values.equipment}
              onChange={(e) => setField("equipment", e.target.value)}
              placeholder="projector, AC, whiteboard"
              aria-invalid={!!errors.equipment}
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
                  ? "Add room"
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
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-text-subtle">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
