"use client";

import { ErrorState } from "@/components/error-state";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Something went wrong"
      description="An unexpected error occurred while loading this page."
      onRetry={reset}
    />
  );
}
