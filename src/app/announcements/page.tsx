import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Announcements",
};

export default function AnnouncementsPage() {
  return (
    <>
      <PageHeader
        title="Announcements"
        description="Stay updated with university notices and priority alerts."
      />
      <EmptyState
        icon={Megaphone}
        title="Announcements not connected yet"
        description="University notices will be listed here once the backend integration is complete."
      />
    </>
  );
}
