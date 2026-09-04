import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Schedule",
};

export default function SchedulePage() {
  return (
    <>
      <PageHeader
        title="Schedule"
        description="View and manage class schedules across the week."
      />
      <EmptyState
        icon={CalendarDays}
        title="Schedule not connected yet"
        description="Class schedules will be listed here once the backend integration is complete."
      />
    </>
  );
}
