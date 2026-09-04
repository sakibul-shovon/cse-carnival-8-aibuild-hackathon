export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: { code: string; details?: unknown };
}

export interface Course { id: string; code: string; title: string; department: string }
export interface RoomFeature { id: string; name: string }
export interface RoomBooking { id: string; bookedBy: string; purpose: string; startsAt: string; endsAt: string }
export interface Room {
  id: string; number: string; type: string; capacity: number; floor: number; status: string;
  features: RoomFeature[]; bookings?: RoomBooking[];
}
export interface Schedule {
  id: string; dayOfWeek: string; startTime: string; endTime: string; instructor: string; section: string; semester: string;
  course: Course; room: Pick<Room, "id" | "number" | "type" | "capacity" | "floor" | "status">;
}
export interface CampusEvent {
  id: string; name: string; description: string | null; startsAt: string; endsAt: string; venueLabel: string;
  organizer: string; capacity: number; status: string; _count: { registrations: number }; room?: Room | null;
}
export interface AssignmentSubmission { id: string; status: string; submittedAt: string | null }
export interface Assignment {
  id: string; title: string; description: string | null; assignedAt: string; dueAt: string;
  submissionPlatform: string; marks: number; course: Course; submissions?: AssignmentSubmission[];
}
export interface Announcement {
  id: string; title: string; body: string; priority: string; postedBy: string; publishedAt: string; expiresAt: string | null;
}
export interface Notification {
  id: string;
  sourceType: string;
  sourceId: string | null;
  message: string;
  sendAt: string;
  status: "PENDING" | "SENT" | "READ" | "FAILED";
  createdAt: string;
}
export interface DashboardData {
  schedules: Schedule[];
  rooms: Room[];
  events: CampusEvent[];
  assignments: Assignment[];
  announcements: Announcement[];
}
export interface AgentReply { message: string; toolsUsed: string[]; sessionId: string }
