import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";

export function LoadingState() {
  return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-5 animate-spin" /> Loading campus data…</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center" role="alert">
      <AlertCircle className="size-7 text-destructive" />
      <div><p className="font-semibold">Campus data is unavailable</p><p className="mt-1 text-sm text-muted-foreground">{message}</p></div>
      <Button type="button" variant="outline" onClick={onRetry}>Try again</Button>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground"><Inbox className="size-6" /><p>{label}</p></div>;
}
