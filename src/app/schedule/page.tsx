import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ScheduleContent } from "@/components/schedule/schedule-content";

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
      <ScheduleContent />
    </>
  );
}
