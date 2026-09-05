import {
  Bot,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  LayoutDashboard,
  Megaphone,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Campus overview and quick insights",
  },
  {
    title: "Schedule",
    href: "/schedule",
    icon: CalendarDays,
    description: "Class schedules and timetables",
  },
  {
    title: "Rooms",
    href: "/rooms",
    icon: DoorOpen,
    description: "Room directory and bookings",
  },
  {
    title: "Events",
    href: "/events",
    icon: PartyPopper,
    description: "Campus events and registrations",
  },
  {
    title: "Announcements",
    href: "/announcements",
    icon: Megaphone,
    description: "University notices and updates",
  },
  {
    title: "Assignments",
    href: "/assignments",
    icon: ClipboardList,
    description: "Course deadlines and submissions",
  },
  {
    title: "AI Agent",
    href: "/ai",
    icon: Bot,
    description: "Ask CampusOS anything",
  },
];
