import type { Metadata } from "next";
import { PartyPopper } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

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
      <EmptyState
        icon={PartyPopper}
        title="Events not connected yet"
        description="Campus events and registrations will be listed here once the backend integration is complete."
      />
    </>
  );
}
