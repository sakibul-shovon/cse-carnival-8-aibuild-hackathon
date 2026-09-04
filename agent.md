# CampusOS — AI Agent Documentation

## 1. AI Agent Overview
The CampusOS AI Agent acts as a natural-language campus assistant for students. Its primary purpose is to allow users to intuitively query and mutate campus information without navigating complex UI filters. 
It operates in tandem with the Campus Data Manager (dashboard). Crucially, the AI Agent must operate strictly on **real-time, live campus data**. It does not maintain a separate database, nor does it hallucinate answers; it relies entirely on the exact same backend state that powers the dashboard.

## 2. AI Architecture
The interaction flow for the AI Agent is designed to securely and reliably bridge natural language with strict backend services.

```text
User
↓
AI Agent
↓
LLM
↓
Native Tool / Function Calling
↓
Backend Service Layer
↓
Supabase PostgreSQL
↓
Tool Result
↓
LLM
↓
Final Response
```
- **User:** Enters a natural language query.
- **AI Agent & LLM:** Interprets intent and extracts structured parameters.
- **Native Tool Calling:** The LLM decides which predefined tool to invoke, passing the structured parameters.
- **Backend Service Layer:** The Next.js API executes the business logic (validation, conflict checks) ensuring the AI respects the same rules as the dashboard.
- **Supabase PostgreSQL:** The persistent database queries or mutates the live data.
- **Tool Result:** The backend returns structured success/failure context to the LLM.
- **Final Response:** The LLM formulates a concise, conversational answer for the user based *only* on the tool result.

## 3. Core AI Principles
The agent must adhere strictly to the following 10 principles:
1. **Never hallucinate campus data.** All answers must stem from tool results.
2. **Query live backend data.** Do not use static files or hardcoded memory.
3. **Never claim an action succeeded without confirmation.** Wait for the tool result.
4. **Ask clarification for missing critical information.** 
5. **Refuse invalid or unauthorized requests.**
6. **Handle vague requests appropriately** by seeking necessary details.
7. **Use multiple tools when required** to fulfill complex queries.
8. **Respect dates and times**, resolving relative dates against current university calendars.
9. **Return useful, concise answers.**
10. **Distinguish information requests from action requests.**

## 4. Tool Inventory
The agent utilizes nine native tools to interact with the backend.

### 1. `get_schedule`
- **Purpose:** Retrieve schedule information.
- **Parameters:** `day?` (optional)
- **Use When:** User asks for general schedule info or a specific day's classes.
- **Backend Dependency:** `schedules` table.

### 2. `get_next_class`
- **Purpose:** Determine the user's next class.
- **Parameters:** `current_day`, `current_time`
- **Use When:** User asks "Where do I go next?"
- **Backend Dependency:** `schedules` table.

### 3. `get_assignments`
- **Purpose:** Retrieve course deadlines and tasks.
- **Parameters:** `course?`, `status?`, `due_before?`
- **Use When:** User asks about pending homework or grades.
- **Backend Dependency:** `assignments` table.

### 4. `get_announcements`
- **Purpose:** Fetch campus notices.
- **Parameters:** `priority?`, `active_only?`
- **Use When:** User asks for news or priority updates.
- **Backend Dependency:** `announcements` table.

### 5. `get_events`
- **Purpose:** Discover campus activities.
- **Parameters:** `date?`, `upcoming_only?`
- **Use When:** User wants to know what's happening on campus.
- **Backend Dependency:** `events` table.

### 6. `check_room_availability`
- **Purpose:** Verify room status.
- **Parameters:** `date`, `start_time`, `end_time`, `min_capacity?`, `required_equipment?`
- **Use When:** User needs a specific type of room or wants to know if a room is free.
- **Backend Dependency:** `rooms` and `room_bookings` tables.

### 7. `book_room`
- **Purpose:** Execute a reservation.
- **Parameters:** `room_number`, `date`, `start_time`, `end_time`, `purpose`, `booked_by`
- **Use When:** User explicitly asks to book a room.
- **Backend Dependency:** `room_bookings` table.

### 8. `register_for_event`
- **Purpose:** Sign up for an activity.
- **Parameters:** `event_name_or_id`, `student_name`, `student_id`
- **Use When:** User says "Register me for X."
- **Backend Dependency:** `event_registrations` table.

### 9. `cancel_registration`
- **Purpose:** Remove an existing signup.
- **Parameters:** `event_name_or_id`, `student_id`
- **Use When:** User asks to drop out of an event.
- **Backend Dependency:** `event_registrations` table.

**General Tool Rules:** All tools map directly to backend services. Validation occurs server-side. Failures must return descriptive error messages (e.g., "Room is full") which the AI relays to the user.

## 5. Read Operations
For read operations (Schedules, Assignments, Announcements, Events, Room Availability), the AI calls the appropriate `get_*` tool with extracted parameters. It interprets the structured JSON response and summarizes it concisely. If the backend returns an empty array, the AI correctly informs the user that no records were found.

## 6. Action Operations
Action operations (Booking, Registering, Cancelling) are strict. The AI extracts the required parameters, executes the tool, and **waits for the backend response**. 
- If the backend returns `success: true`, the AI confirms the action.
- If the backend returns an error (e.g., `overlap detected`), the AI explains the failure to the user and **does not** claim the action succeeded.

## 7. Room Booking Reasoning
- **Sufficient Info:** "Book Room 7A02 tomorrow from 3 PM to 5 PM." → AI resolves "tomorrow", executes `book_room`, confirms success.
- **Requires Search:** "I need a room for 5 people with a projector tomorrow between 2 and 4." → AI executes `check_room_availability` first, presents options, and waits for user selection before booking.
- **Needs Clarification:** "Just book me any room tomorrow afternoon." → AI asks "What time and how many people?"
- **Rejection:** AI rejects the booking if the backend tool returns a conflict error.

## 8. Event Registration Reasoning
- **Identification:** AI matches the user's natural language event name to the official `event_name_or_id`.
- **Validation:** Backend handles capacity, cancellation state, and duplicate checks.
- **Confirmation:** AI only reports "You are registered" if the tool returns a database success.

## 9. Clarification Rules
The AI should ask *only* the necessary clarification questions to fulfill a tool's required parameters.
Examples:
- Unspecified date/time for a booking.
- Missing student ID for registration.
- Multiple matching rooms found for a vague query.

## 10. Refusal Rules
The AI must politely refuse or explain its inability to act when:
- Requested data does not exist in the database.
- Action is invalid (e.g., booking outside university hours).
- Room is unavailable / Booking conflicts.
- Event is full or cancelled.
- Duplicate registration exists.
- Required information is missing after asking.
- The operation is outside supported CampusOS capabilities (e.g., "Order me a pizza").

**Rule:** Do not fabricate alternatives that are not supported by the tool results.

## 11. Live Data Requirement
**Critical Hackathon Scenario:**
If a judge changes data in the dashboard (e.g., moving a class to a new room) and immediately asks the AI, "Where is my class?", the AI **must** use the `get_schedule` tool to fetch the fresh data from Supabase. 
The AI must never rely on stale, hardcoded, or statically loaded JSON data.

## 12. Multi-Tool Reasoning
Complex queries require sequential tool execution.
**Example:** *"I need a room for 5 people with a projector tomorrow between 2 and 4."*
1. AI resolves "tomorrow" to a strict ISO date.
2. AI calls `check_room_availability(date, 14:00, 16:00, 5, ["projector"])`.
3. Tool returns a list of matching rooms (e.g., Room 7B01).
4. AI responds: "Room 7B01 is available. Would you like me to book it for you?"
*(If the user says yes, it proceeds to call `book_room`).*

## 13. Date and Time Reasoning
- **Dates:** Must be resolved to ISO 8601 (`YYYY-MM-DD`).
- **Time:** Must be resolved to 24-hour `HH:MM`.
- **University Week:** Sunday to Thursday.
- **Relative Dates:** "Tomorrow", "Next Wednesday", or "due this week" must be calculated dynamically based on the current system day/time passed in the system prompt. Never hardcode dates.

## 14. Tool Error Handling
- **Database/Validation Errors:** AI relays the specific error ("Invalid time format").
- **No Results/Missing Records:** AI states cleanly that no matching data was found.
- **Conflicts/Unavailable Rooms:** AI explains the room is taken and may optionally suggest checking another time.
- **Event Full/Duplicate:** AI relays the backend rejection message.

## 15. AI Response Style
Responses must be:
- **Clear & Concise:** Easy to scan on a mobile device.
- **Useful & Accurate:** Directly answering the question based on data.
- **Transparent:** Explaining *what* it is doing (e.g., "Let me check the schedule...").
*Do not expose raw JSON, stack traces, or internal tool names to the user.*

## 16. AI Test Scenarios
The agent is evaluated against these official scenarios:
1. "When is my next class?" (Read: Schedules)
2. "What classes do I have on Wednesday?" (Read: Schedules)
3. "What assignments do I have due this week?" (Read: Assignments)
4. "Show me all high priority announcements." (Read: Announcements)
5. "I'm free until 2 PM — is there anything on campus I could drop into?" (Multi-Tool: Schedule + Events)
6. "Which labs have a projector and can fit at least 30 people?" (Read: Rooms)
7. "Book Room 7A02 tomorrow from 3 PM to 5 PM." (Action: Booking)
8. "Register me for the Guest Lecture on Deep Learning." (Action: Registration)
9. "I need a room for 5 people with a projector, tomorrow between 2 and 4." (Multi-Tool: Search + Booking)
10. "Just book me any room tomorrow afternoon." (Reasoning: Clarification required)

## 17. Security
- **API Key Protection:** LLM API keys must remain safely on the backend server.
- **Server-Side Credentials:** Supabase Service keys must never be exposed to the client or the LLM context.
- **Input Validation:** Backend must sanitize all tool parameters provided by the LLM to prevent injection or malicious inputs.
- **Authorization:** AI tools only have access to perform actions explicitly defined in the service layer.

## 18. Current Implementation Status
*Verified against the actual repository.*
- **Implemented Tools:** None (0/9).
- **Partial Tools:** None.
- **Unimplemented Tools:** All 9 tools pending implementation (Task 6 & Task 7).
- **Tested Tools:** None.
- **Known Issues:** The core backend and LLM provider have not yet been initialized. Data exists only as static JSON seed files.
