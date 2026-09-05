import {
  CalendarClock,
  ClipboardList,
  DoorOpen,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";

export type Suggestion = { icon: LucideIcon; label: string; prompt: string };

export const SUGGESTIONS: Suggestion[] = [
  {
    icon: CalendarClock,
    label: "Next class",
    prompt: "When is my next class?",
  },
  {
    icon: ClipboardList,
    label: "Due this week",
    prompt: "What assignments do I have due this week?",
  },
  {
    icon: DoorOpen,
    label: "Find a room",
    prompt:
      "I need a room for 5 people with a projector tomorrow between 2 and 4 PM.",
  },
  {
    icon: PartyPopper,
    label: "What's on",
    prompt: "Any events I could drop into on campus this week?",
  },
];

export function SuggestedPrompts({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => onSelect(s.prompt)}
          disabled={disabled}
          className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-ai/40 hover:bg-ai-surface/40 focus-visible:border-ai/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai/30 disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ai-surface text-ai-accent">
            <s.icon className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">{s.label}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {s.prompt}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
