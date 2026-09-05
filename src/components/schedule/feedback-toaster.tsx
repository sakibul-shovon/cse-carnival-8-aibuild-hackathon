"use client";

import * as React from "react";
import { CheckCircle2, X, AlertTriangle } from "lucide-react";
import { cn } from "cn";

export type FeedbackKind = "success" | "error";
export type Feedback = { id: number; kind: FeedbackKind; message: string };

export function useFeedback() {
  const [items, setItems] = React.useState<Feedback[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const notify = React.useCallback(
    (kind: FeedbackKind, message: string) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return { items, notify, dismiss };
}

export function FeedbackToaster({
  items,
  onDismiss,
}: {
  items: Feedback[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      aria-live="polite"
      role="status"
    >
      {items.map((f) => (
        <div
          key={f.id}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-md",
            f.kind === "success"
              ? "border-success/30 bg-success/10 text-[color-mix(in_oklab,var(--success),black_25%)] dark:text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          )}
        >
          {f.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <span className="flex-1">{f.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(f.id)}
            className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Dismiss notification"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
