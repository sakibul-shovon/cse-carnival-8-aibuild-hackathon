import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { RoomsContent } from "@/components/rooms/rooms-content";

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
      <RoomsContent />
    </>
  );
}
