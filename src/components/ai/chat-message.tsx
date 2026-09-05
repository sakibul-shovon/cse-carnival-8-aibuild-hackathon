import { Bot, User } from "lucide-react";
import { cn } from "cn";
import { ToolTrace } from "./tool-trace";
import type { ToolEvent } from "@/types/ai";

export type UiRole = "user" | "assistant";

// Renders inline **bold** segments so markdown syntax isn't shown to the user.
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const match = /^\*\*([^*]+)\*\*$/.exec(part);
    if (match) {
      return (
        <strong key={i} className="font-semibold">
          {match[1]}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// Lightweight formatter: preserves line breaks and renders simple bullet lines.
function FormattedContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed === "") return <div key={i} className="h-1" />;
        const bullet = /^([-*•])\s+/.test(trimmed);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2">
              <span aria-hidden="true" className="text-ai-accent">
                •
              </span>
              <span>{renderInline(trimmed.replace(/^([-*•])\s+/, ""))}</span>
            </div>
          );
        }
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

export function ChatMessage({
  role,
  content,
  toolEvents,
}: {
  role: UiRole;
  content: string;
  toolEvents?: ToolEvent[];
}) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-ai-surface text-ai-accent"
        )}
        aria-hidden="true"
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </span>
      <div
        className={cn(
          "min-w-0 max-w-[85%] rounded-xl px-4 py-3 text-sm sm:max-w-[75%]",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-ai/15 bg-surface"
        )}
      >
        <FormattedContent content={content} />
        {!isUser && toolEvents ? <ToolTrace events={toolEvents} /> : null}
      </div>
    </div>
  );
}
