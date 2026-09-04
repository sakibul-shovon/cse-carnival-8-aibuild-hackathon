import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      action={
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      }
    />
  );
}
