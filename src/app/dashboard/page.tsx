import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard",
};

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description={todayLabel()} />
      <DashboardContent />
    </>
  );
}