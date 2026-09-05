import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { AssignmentsContent } from "@/components/assignments/assignments-content";

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
      <AssignmentsContent />
    </>
  );
}
