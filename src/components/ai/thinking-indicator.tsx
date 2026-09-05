"use client";

import * as React from "react";
import { Bot } from "lucide-react";

// Rotating, campus-themed hints shown while the assistant works. These are
// generic activity cues (not fabricated results) since the response is atomic.
const HINTS = [
  "Reading live campus data…",
  "Checking schedules and rooms…",
  "Cross-referencing events and deadlines…",
  "Putting your answer together…",
];

export function ThinkingIndicator() {
  const [hint, setHint] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(
      () => setHint((h) => (h + 1) % HINTS.length),
      1800
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex gap-3" aria-live="polite">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ai-surface text-ai-accent"
        aria-hidden="true"
      >
        <Bot className="size-4" />
      </span>
      <div className="flex items-center gap-3 rounded-xl border border-ai/15 bg-surface px-4 py-3">
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-1.5 animate-bounce rounded-full bg-ai-accent [animation-delay:-0.3s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-ai-accent [animation-delay:-0.15s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-ai-accent" />
        </span>
        <span className="text-sm text-muted-foreground">{HINTS[hint]}</span>
      </div>
    </div>
  );
}
