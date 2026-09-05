import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EventsContent } from "@/components/events/events-content";

export const metadata: Metadata = {
  title: "Events",
};

export default function EventsPage() {
  return (
    <>
      <PageHeader
        title="Events"
        description="Discover campus events and manage registrations."
      />
      <EventsContent />
    </>
  );
}
