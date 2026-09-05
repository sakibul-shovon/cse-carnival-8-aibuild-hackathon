import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { AnnouncementsContent } from "@/components/announcements/announcements-content";

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
      <AnnouncementsContent />
    </>
  );
}
