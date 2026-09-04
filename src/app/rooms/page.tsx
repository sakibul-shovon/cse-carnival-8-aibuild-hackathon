import type { Metadata } from "next";
import { DoorOpen } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Rooms",
};

export default function RoomsPage() {
  return (
    <>
      <PageHeader
        title="Rooms"
        description="Browse the room directory, check availability, and manage bookings."
      />
      <EmptyState
        icon={DoorOpen}
        title="Rooms not connected yet"
        description="The room directory and bookings will be listed here once the backend integration is complete."
      />
    </>
  );
}
