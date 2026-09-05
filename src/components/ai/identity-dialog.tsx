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
import type { ChatUser } from "@/types/ai";

export function IdentityDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ChatUser | null;
  onSave: (user: ChatUser | null) => void;
}) {
  const [name, setName] = React.useState("");
  const [studentId, setStudentId] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setStudentId(initial?.student_id ?? "");
  }, [open, initial]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedId = studentId.trim();
    onSave(trimmedName && trimmedId ? { name: trimmedName, student_id: trimmedId } : null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your details</DialogTitle>
          <DialogDescription>
            Optional. Sharing your name and student ID lets the assistant book
            rooms and register you for events without asking each time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Full name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sakibul Hassan"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Student ID</Label>
            <Input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. 20-40532"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
