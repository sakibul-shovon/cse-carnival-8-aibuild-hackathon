import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  DoorOpen,
  Megaphone,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { Card } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/dashboard-selectors";

type StatDef = {
  key: keyof DashboardStats | "rooms";
  label: string;
  value: string;
  icon: LucideIcon;
  href: string;
  accent: string;
};

export function StatCards({ stats }: { stats: DashboardStats }) {
  const items: StatDef[] = [
    {
      key: "classesToday",
      label: "Classes today",
      value: String(stats.classesToday),
      icon: CalendarDays,
      href: "/schedule",
      accent: "text-schedule",
    },
    {
      key: "pendingAssignments",
      label: "Pending assignments",
      value: String(stats.pendingAssignments),
      icon: ClipboardList,
      href: "/assignments",
      accent: "text-assignment",
    },
    {
      key: "upcomingEvents",
      label: "Upcoming events",
      value: String(stats.upcomingEvents),
      icon: PartyPopper,
      href: "/events",
      accent: "text-event",
    },
    {
      key: "activeAnnouncements",
      label: "Active announcements",
      value: String(stats.activeAnnouncements),
      icon: Megaphone,
      href: "/announcements",
      accent: "text-announcement",
    },
    {
      key: "rooms",
      label: "Rooms available now",
      value: `${stats.roomsAvailable}/${stats.roomsTotal}`,
      icon: DoorOpen,
      href: "/rooms",
      accent: "text-room",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <Card key={item.key} size="sm" className="p-0">
          <Link
            href={item.href}
            className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
          >
            <item.icon
              className={cn("size-5", item.accent)}
              aria-hidden="true"
            />
            <span className="text-2xl font-bold tracking-tight tabular-nums">
              {item.value}
            </span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </Link>
        </Card>
      ))}
    </div>
  );
}
