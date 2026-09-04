import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Assignments",
};

export default function AssignmentsPage() {
  return (
    <>
      <PageHeader
        title="Assignments"
        description="Track course deadlines, submissions, and grades."
      />
      <EmptyState
        icon={ClipboardList}
        title="Assignments not connected yet"
        description="Course assignments and deadlines will be listed here once the backend integration is complete."
      />
    </>
  );
}
