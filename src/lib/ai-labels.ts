import {
  CalendarCheck,
  CalendarSearch,
  ClipboardList,
  Clock,
  DoorOpen,
  Megaphone,
  PartyPopper,
  Search,
  Ticket,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export type ActionLabel = {
  /** Present continuous, shown while the assistant is working. */
  active: string;
  /** Past tense, shown once the tool has completed. */
  done: string;
  icon: LucideIcon;
};

// Maps backend tool names to friendly, non-technical action labels for the UI.
const LABELS: Record<string, ActionLabel> = {
  get_schedule: { active: "Checking your schedule", done: "Checked the schedule", icon: CalendarSearch },
  get_next_class: { active: "Finding your next class", done: "Found your next class", icon: Clock },
  get_assignments: { active: "Looking up assignments", done: "Checked assignments", icon: ClipboardList },
  get_announcements: { active: "Reading announcements", done: "Checked announcements", icon: Megaphone },
  get_events: { active: "Searching events", done: "Searched events", icon: PartyPopper },
  check_room_availability: { active: "Checking room availability", done: "Checked room availability", icon: DoorOpen },
  book_room: { active: "Booking the room", done: "Booked the room", icon: CalendarCheck },
  register_for_event: { active: "Registering you", done: "Registered you", icon: UserPlus },
  cancel_registration: { active: "Cancelling registration", done: "Cancelled registration", icon: UserMinus },
  get_current_datetime: { active: "Checking the time", done: "Checked the time", icon: Clock },
};

const FALLBACK: ActionLabel = {
  active: "Working on it",
  done: "Done",
  icon: Search,
};

export function actionLabel(toolName: string): ActionLabel {
  return LABELS[toolName] ?? FALLBACK;
}

export const DEFAULT_ACTION_ICON = Ticket;
