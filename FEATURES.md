# CampusOS — Features

## 1. Feature Overview
CampusOS is a comprehensive university operating system designed to unify scattered campus information into a single interface, augmented by an intelligent AI Assistant.

The complete feature set is organized into the following areas:
1. Campus Data Management
2. Schedule Management
3. Room Management
4. Room Booking
5. Event Management
6. Event Registration
7. Announcement Management
8. Assignment Management
9. AI Agent
10. Dashboard
11. AI Assistant UI
12. Security
13. Testing
14. Deployment

**Status Legend:**
- `[x]` Completed
- `[~]` In Progress
- `[ ]` Not Started
- `[!]` Blocked

## 2. Campus Data Management
CampusOS requires a robust backend capable of comprehensive CRUD (Create, Read, Update, Delete) operations across five core systems, ensuring data persists in Supabase PostgreSQL.

- `[x]` **Schedules CRUD:** Full management of class schedules.
- `[x]` **Rooms CRUD:** Full management of campus rooms and facilities.
- `[x]` **Events CRUD:** Full management of campus events.
- `[x]` **Announcements CRUD:** Full management of notices.
- `[x]` **Assignments CRUD:** Full management of deadlines and tasks.

*User Value:* Ensures university staff or administrators can effortlessly keep campus data accurate and up-to-date in real time.

## 3. Schedule Features
- `[ ]` **View Schedule:** Display schedules in a clean, readable format.
- `[ ]` **Day Filtering:** Filter classes by specific days (e.g., "Monday").
- `[ ]` **Next Class:** Identify the immediate next class based on current day and time.
- `[ ]` **Live Data Integration:** Ensure changes made to the schedule instantly reflect across the dashboard and AI Agent.

## 4. Room Features
- `[ ]` **Room Listing:** View all rooms on campus.
- `[ ]` **Room Details:** View specific details including capacity, equipment, type, and floor.
- `[ ]` **Availability View:** Check current real-time availability status.
- `[ ]` **Booking History:** View past and current bookings (where implemented).

## 5. Room Booking
Room booking requires strict backend validation to prevent overlapping schedules.

- `[x]` **Availability Search:** Search for free rooms by date/time window.
- `[x]` **Capacity Filtering:** Find rooms large enough for a specific group.
- `[x]` **Equipment Filtering:** Ensure the room has required equipment (e.g., projectors).
- `[x]` **Date/Time Filtering:** Ensure the room is available during the requested block.
- `[x]` **Booking Creation:** Persist the booking to the database.
- `[x]` **Overlap Prevention:** Reject conflicting bookings using rule: `new_start < existing_end AND new_end > existing_start`.
- `[x]` **Back-to-back Allowed:** Consecutive bookings (13:00–15:00, 15:00–17:00) are correctly permitted.
- `[x]` **Backend Confirmation:** Booking is confirmed only after successful database write.

**Overlap Rule:**
A booking must be rejected if an overlap exists:
`new_start < existing_end AND new_end > existing_start`

## 6. Event Registration (Backend)
- `[x]` **Register for Event:** Create registration after validating event status, capacity, and duplicate check.
- `[x]` **Capacity Enforcement:** Reject registration when `registered >= capacity`.
- `[x]` **Duplicate Prevention:** Prevent same student_id from registering for the same event twice.
- `[x]` **Cancel Registration:** Remove registration and decrement `registered` count.
- `[x]` **Status Synchronization:** Event `status` auto-updates to `full` when capacity is reached; reverts to `upcoming` when a spot opens.
- `[x]` **Count Consistency:** `registered` count always reflects actual registrations in the database.

## 7. Event Features (Frontend — Not Started)
- `[ ]` **Event Listing:** Browse upcoming, ongoing, and completed events.
- `[ ]` **Event Details:** View comprehensive details including venue, organizer, and capacity.
- `[ ]` **Date Filtering:** Find events on a specific day or week.
- `[ ]` **Status Tracking:** Display whether an event is upcoming, cancelled, or full.
- `[ ]` **Registration Management:** Track how many students have registered vs. capacity.

## 7. Announcement Features
- `[ ]` **Announcement List:** View all notices.
- `[ ]` **Priority Handling:** Visually distinguish between "high", "medium", and "low" priority.
- `[ ]` **Active/Expired Handling:** Automatically filter or visually fade announcements past their expiry date.

## 8. Assignment Features
- `[ ]` **Assignment List:** View all assignments.
- `[ ]` **Deadline Tracking:** Highlight approaching deadlines.
- `[ ]` **Course Filtering:** Filter assignments by specific course.
- `[ ]` **Status & Marks:** Track if an assignment is pending, submitted, or graded, and display marks.

## 9. AI Agent Features
The AI Agent must be implemented using native tool calling, backed by real APIs.

- `[ ]` **get_schedule(day?)**: Retrieve schedules, optionally filtered by day.
- `[ ]` **get_next_class(current_day, current_time)**: Determine the next class for a student.
- `[ ]` **get_assignments(course?, status?, due_before?)**: Retrieve assignments with robust filtering.
- `[ ]` **get_announcements(priority?, active_only?)**: Read campus notices.
- `[ ]` **get_events(date?, upcoming_only?)**: Check campus events.
- `[ ]` **check_room_availability(date, start_time, end_time, min_capacity?, required_equipment?)**: Verify a room is free and meets requirements.
- `[ ]` **book_room(room_number, date, start_time, end_time, purpose, booked_by)**: Execute a booking.
- `[ ]` **register_for_event(event_name_or_id, student_name, student_id)**: Execute an event registration.
- `[ ]` **cancel_registration(event_name_or_id, student_id)**: Cancel an existing registration.

## 10. AI Intelligence Features
- `[ ]` **Natural Language Understanding:** Parse natural student queries into strict tool parameters.
- `[ ]` **Tool Selection:** Correctly choose the right tool for the job.
- `[ ]` **Multi-Tool Reasoning:** Combine tools (e.g., checking a schedule to find a gap, then checking room availability during that gap).
- `[ ]` **Clarification:** Ask follow-up questions if a request is ambiguous (e.g., missing time or room).
- `[ ]` **Refusal:** Politely refuse unauthorized actions or actions that fail backend validation.
- `[ ]` **Latest Data:** Guarantee that AI responses use real-time, non-stale data.
- `[ ]` **Date/Time Reasoning:** Safely resolve relative terms like "tomorrow".
- `[ ]` **Action Confirmation:** Wait for the backend tool to return success before telling the user the action is complete.

## 11. Example User Flows
- **Next Class:** The user asks, "When is my next class?" → AI uses `get_next_class` and responds with the time and room.
- **Wednesday Classes:** The user asks, "What classes do I have on Wednesday?" → AI uses `get_schedule("Wednesday")` and lists them.
- **Assignments Due:** The user asks, "What assignments do I have due this week?" → AI uses `get_assignments`.
- **High-Priority Announcements:** The user asks to see important notices → AI uses `get_announcements("high", true)`.
- **Campus Activities:** The user says, "I'm free until 2 PM — is there anything on campus?" → AI checks schedule, checks events, and suggests options.
- **Room Booking (Vague):** "Book me a room tomorrow." → AI asks for clarification on time and requirements.
- **Room Booking (Specific):** "I need a room for 5 people with a projector, tomorrow between 2 and 4." → AI checks availability, finds a match, and books it.
- **Event Registration:** User asks to join a guest lecture → AI validates capacity and executes `register_for_event`.

## 12. Frontend Features
- `[ ]` **Dashboard:** Central command center summarizing today's campus state.
- `[x]` **Navigation:** Intuitive sidebar or bottom-bar routing.
- `[ ]` **Schedule UI:** Timetable or list view for classes.
- `[ ]` **Room UI:** Directory and availability tracking.
- `[ ]` **Events UI:** Discovery and registration views.
- `[ ]` **Announcements UI:** Scannable noticeboard.
- `[ ]` **Assignments UI:** Deadline tracker.
- `[ ]` **AI Assistant:** Slide-over or persistent chat interface.
- `[ ]` **Responsive Behavior:** Flawless mobile-first design.
- `[ ]` **Accessibility:** Keyboard navigable, ARIA compliant.

## 13. Feature Dependencies
- **Backend Flow:** Database Schema → Backend Services (CRUD/Validation) → AI Tools → AI Reasoning.
- **Frontend Flow:** Frontend Foundation (`docs/frontend-uiux.md`) → Dashboard/Pages UI → Backend Integration → E2E Integration.

## 14. Roadmap
Refer to `project-context.md` for the official 29-task roadmap. High-level sequence:
1. Supabase Foundation (Tasks 1-4)
2. AI Agent Foundation (Tasks 5-8)
3. Frontend Foundation (Tasks 9-16)
4. Integration (Tasks 17-19)
5. Testing & Hardening (Tasks 20-26)
6. Finalization & Deployment (Tasks 27-29)

## 15. Current Status
**FRONTEND FOUNDATION COMPLETE (Task 9).** Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui are initialized with the design system, app shell, navigation, all 7 routes (placeholder empty states), and reusable UI components. Backend, AI agent, and data-driven UIs are not started.

## 16. Hackathon Demo Priorities
During judging, prioritize:
1. **CRUD:** Demonstrate changes saving to the database.
2. **Live Data:** Show edits reflecting instantly in the UI.
3. **AI Tool Calling:** Show the AI executing real actions.
4. **Room Booking:** Demonstrate conflict prevention.
5. **Event Registration:** Demonstrate capacity handling.
6. **Clarification/Refusal:** Show the AI handling vague or invalid requests safely.
7. **Polished UI:** Ensure the dashboard looks premium.
8. **End-to-End Integration:** Edit a room in the UI, ask the AI about it immediately, and get the correct answer.

## 17. Known Limitations
- The project is currently a documentation skeleton. No frameworks or backend services exist yet.

## 18. Future Enhancements
*Optional features beyond the required hackathon scope:*
- Authentication and User Roles (Admin vs. Student).
- Push notifications for announcements.
- ICS calendar exports for schedules.
- Real-time WebSockets for instant UI updates across clients.
