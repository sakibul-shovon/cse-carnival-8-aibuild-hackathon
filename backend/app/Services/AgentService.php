<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\Assignment;
use App\Models\Event;
use App\Models\Room;
use App\Models\Schedule;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AgentService
{
    /**
     * Process natural language queries with live tools calling against the database.
     */
    public function processQuery(string $message, array $history = [], string $role = 'student'): array
    {
        $geminiKey = env('GEMINI_API_KEY') ?: env('GOOGLE_API_KEY');
        $openaiKey = env('OPENAI_API_KEY');
        $groqKey = env('GROQ_API_KEY');

        // 1. Primary: Real Google Gemini Function/Tool Calling Engine
        if ($geminiKey && !str_starts_with($geminiKey, 'your_')) {
            return $this->processWithGemini($message, $history, $geminiKey, $role);
        }

        // 2. Secondary: OpenAI
        if ($openaiKey && !str_starts_with($openaiKey, 'your_')) {
            return $this->processWithOpenAI($message, $history, $openaiKey, $role);
        }

        // 3. Tertiary: Groq
        if ($groqKey && !str_starts_with($groqKey, 'your_')) {
            return $this->processWithGroq($message, $history, $groqKey, $role);
        }

        // 4. Deterministic Fallback Tool Execution engine if no API key is provided
        return $this->processWithLocalEngine($message, $role);
    }

    /**
     * Google Gemini Live Function/Tool Calling Implementation
     */
    private function processWithGemini(string $message, array $history, string $apiKey, string $role = 'student'): array
    {
        $model = env('GEMINI_MODEL', 'gemini-2.5-flash');
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        $systemInstruction = "You are CampusOS AI Agent — the official intelligent operations assistant for Ahsanullah University of Science and Technology (AUST).
Current Reference Date: Friday, September 4, 2026 (2026-09-04, Friday).
Current Authenticated User Role: {$role}.

CRITICAL SYSTEM RULES:
1. The LIVE MySQL database is the absolute SINGLE SOURCE OF TRUTH. Never invent, hallucinate, or assume schedules, rooms, events, announcements, assignments, or booking statuses.
2. ALWAYS call a tool whenever a user asks about campus data or requests an action. Never answer campus information from static memory or seed assumptions.
3. Correctly resolve relative dates based on current reference date (2026-09-04):
   - 'today' = 2026-09-04 (Friday)
   - 'tomorrow' = 2026-09-05 (Saturday)
   - 'next class' / 'next academic day' = Sunday (2026-09-06) since university academic week is Sunday to Thursday.
   - 'this week' = 2026-09-04 through 2026-09-11.
4. ROLE-BASED ACCESS CONTROL (RBAC):
   - 'student' role: Can use read tools (get_schedule, get_room_availability, search_rooms, get_events, get_announcements, get_assignments, register_for_event).
   - 'student' role: CANNOT book rooms, cancel room bookings, or mutate rooms. If a student requests room booking or room management, politely explain that room reservations and booking management require university administrator privileges.
   - 'admin' role: Has full access to both read tools and mutation tools (book_room, cancel_room_booking).
5. Tool Authorization & Confirmation:
   - Authorization is enforced by the server. If a tool returns an error or permission denial, accurately relay the message.
   - NEVER claim an action or booking succeeded unless the backend database tool explicitly returns success: true with confirmed details.
6. Missing Information: If required parameters (e.g. room number, time slot) are missing for an action, ask a concise clarifying question instead of guessing.
7. If a tool returns no results, state it plainly and clearly.
8. Keep your replies concise, helpful, friendly, and properly formatted with markdown bullet points.";

        $tools = $this->getGeminiToolsDefinition();

        $contents = [];
        foreach ($history as $h) {
            $roleLabel = ($h['role'] === 'assistant' || $h['role'] === 'model') ? 'model' : 'user';
            $contents[] = [
                'role' => $roleLabel,
                'parts' => [['text' => (string)($h['content'] ?? '')]]
            ];
        }
        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $message]]
        ];

        $executedActions = [];
        $maxTurns = 6;
        $turn = 0;

        try {
            while ($turn < $maxTurns) {
                $turn++;
                $payload = [
                    'system_instruction' => [
                        'parts' => [['text' => $systemInstruction]]
                    ],
                    'contents' => $contents,
                    'tools' => $tools,
                ];

                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])->timeout(30)->post($url, $payload);

                if (!$response->successful()) {
                    Log::error('Gemini API Error', [
                        'status' => $response->status(),
                        'body' => $response->body()
                    ]);
                    break;
                }

                $resData = $response->json();
                $candidate = $resData['candidates'][0] ?? null;
                if (!$candidate || empty($candidate['content']['parts'])) {
                    break;
                }

                $modelContent = $candidate['content'];
                $contents[] = $modelContent;

                $functionCalls = [];
                $finalText = '';

                foreach ($modelContent['parts'] as $part) {
                    if (!empty($part['functionCall'])) {
                        $functionCalls[] = $part['functionCall'];
                    }
                    if (!empty($part['text'])) {
                        $finalText .= $part['text'];
                    }
                }

                if (empty($functionCalls)) {
                    return [
                        'response' => $finalText ?: 'I have processed your request.',
                        'actions' => $executedActions,
                        'source' => 'gemini_agent',
                    ];
                }

                $responseParts = [];
                foreach ($functionCalls as $fc) {
                    $toolName = $fc['name'];
                    $args = $fc['args'] ?? [];
                    $toolResult = $this->executeTool($toolName, $args, $role);

                    $executedActions[] = [
                        'tool' => $toolName,
                        'args' => $args,
                        'result' => $toolResult,
                    ];

                    $responseParts[] = [
                        'functionResponse' => [
                            'name' => $toolName,
                            'response' => $toolResult,
                        ]
                    ];
                }

                $contents[] = [
                    'role' => 'user',
                    'parts' => $responseParts,
                ];
            }
        } catch (\Throwable $e) {
            Log::error('Gemini Agent Exception: ' . $e->getMessage());
        }

        return $this->processWithLocalEngine($message, $role);
    }

    /**
     * Deterministic and robust Natural Language Query Engine reading live MySQL/DB state
     */
    public function processWithLocalEngine(string $message, string $role = 'student'): array
    {
        $lower = strtolower(trim($message));
        $actions = [];

        // 1. Vague room booking check
        if ((str_contains($lower, 'book me any room') || str_contains($lower, 'book a room for me') || str_contains($lower, 'just book')) && !preg_match('/\b7[a-c]\d{2}\b/i', $lower) && !preg_match('/\b\d{1,2}(:\d{2})?\s*(am|pm)?\s*(to|-)\s*\d{1,2}(:\d{2})?\s*(am|pm)?\b/i', $lower)) {
            if ($role !== 'admin') {
                return [
                    'response' => "Room booking is restricted to university administrators. As a student, you can view room schedules and find available rooms, but bookings must be managed by an administrator.",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }
            return [
                'response' => "To book a room for you, please specify the exact room number (e.g. 7A02, 7C01), the date, start time, and end time (e.g., 'Book Room 7A02 tomorrow from 3 PM to 5 PM').",
                'actions' => [],
                'source' => 'live_agent',
            ];
        }

        // 2. Room booking action (e.g. "Book Room 7A02 tomorrow from 3 PM to 5 PM" or "Book Room 301 for me")
        if (preg_match('/book\s+(?:room\s+)?([0-9A-Za-z]+)/i', $message, $roomMatch) || str_contains($lower, 'book room') || str_contains($lower, 'reserve room') || str_contains($lower, 'booking')) {
            if ($role !== 'admin') {
                return [
                    'response' => "Room booking is restricted to university administrators. As a student, you can check room availability and schedules, but you do not have permission to book or reserve rooms.",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }

            $rawRoom = $roomMatch[1] ?? '7A02';
            $roomNum = strtoupper($rawRoom);
            $room = Room::where('room_number', $roomNum)->first();
            if (!$room) {
                // Also check without prefix if 301 entered
                $room = Room::where('room_number', 'like', "%{$roomNum}%")->first();
            }

            if (!$room) {
                return [
                    'response' => "Room {$rawRoom} does not exist in the database.",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }

            // Extract date (e.g., tomorrow or 2026-09-05)
            $date = '2026-09-05'; // default tomorrow
            if (str_contains($lower, 'today')) {
                $date = '2026-09-04';
            } elseif (preg_match('/\b\d{4}-\d{2}-\d{2}\b/', $message, $dm)) {
                $date = $dm[0];
            }

            // Extract time
            $startTime = '15:00';
            $endTime = '17:00';
            if (preg_match('/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|-)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i', $message, $tm)) {
                $startTime = $this->parseTime($tm[1], $tm[2] ?? '00', $tm[3] ?? '');
                $endTime = $this->parseTime($tm[4], $tm[5] ?? '00', $tm[6] ?? '');
            }

            $bookingRes = $this->executeTool('book_room', [
                'room_number' => $room->room_number,
                'booked_by' => 'Campus Administrator',
                'date' => $date,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'purpose' => 'Administrative Reservation',
            ], $role);

            $actions[] = [
                'tool' => 'book_room',
                'args' => ['room_number' => $room->room_number, 'date' => $date, 'start_time' => $startTime, 'end_time' => $endTime],
                'result' => $bookingRes,
            ];

            if ($bookingRes['success']) {
                return [
                    'response' => " Successfully booked Room {$room->room_number} on {$date} from {$startTime} to {$endTime}. Booking ID: {$bookingRes['booking']['booking_id']}.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            } else {
                return [
                    'response' => " Could not book Room {$room->room_number}: {$bookingRes['message']}",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }
        }

        // 3. Register for event action (e.g. "Register me for the Guest Lecture on Deep Learning")
        if (str_contains($lower, 'register') || str_contains($lower, 'enroll in event')) {
            $events = Event::all();
            $targetEvent = null;
            foreach ($events as $evt) {
                if (str_contains($lower, strtolower($evt->name)) || 
                    (str_contains($lower, 'deep learning') && str_contains(strtolower($evt->name), 'deep learning')) ||
                    (str_contains($lower, 'hackathon') && str_contains(strtolower($evt->name), 'hackathon')) ||
                    (str_contains($lower, 'mid-term review') && str_contains(strtolower($evt->name), 'mid-term')) ||
                    (str_contains($lower, 'carnival') && str_contains(strtolower($evt->name), 'carnival')) ||
                    (str_contains($lower, 'git') && str_contains(strtolower($evt->name), 'git')) ||
                    (str_contains($lower, 'iupc') && str_contains(strtolower($evt->name), 'iupc'))) {
                    $targetEvent = $evt;
                    break;
                }
            }

            if ($targetEvent) {
                $regRes = $this->executeTool('register_for_event', [
                    'event_id' => $targetEvent->id,
                    'student_id' => '22-45123',
                    'name' => 'Current Student',
                ]);

                $actions[] = [
                    'tool' => 'register_for_event',
                    'args' => ['event_id' => $targetEvent->id, 'event_name' => $targetEvent->name],
                    'result' => $regRes,
                ];

                if ($regRes['success']) {
                    return [
                        'response' => " Successfully registered for **{$targetEvent->name}** (Venue: {$targetEvent->venue}, Date: {$targetEvent->date} at {$targetEvent->start_time}). Current registered: {$regRes['event']['registered']}/{$targetEvent->capacity}.",
                        'actions' => $actions,
                        'source' => 'live_agent',
                    ];
                } else {
                    return [
                        'response' => " Registration failed for '{$targetEvent->name}': {$regRes['message']}",
                        'actions' => $actions,
                        'source' => 'live_agent',
                    ];
                }
            }
        }

        // 4. Room queries with filters: capacity, equipment, availability
        if (str_contains($lower, 'room') || str_contains($lower, 'lab') || str_contains($lower, 'seminar')) {
            // "Which labs have a projector and can fit at least 30 people?"
            // "I need a room for 5 people with a projector, tomorrow between 2 and 4"
            $query = Room::query();
            if (str_contains($lower, 'lab')) {
                $query->where('type', 'lab');
            } elseif (str_contains($lower, 'seminar')) {
                $query->where('type', 'seminar');
            } elseif (str_contains($lower, 'classroom')) {
                $query->where('type', 'classroom');
            }

            if (preg_match('/(\d+)\s*(?:people|capacity|seats|students|fit)/i', $message, $cm)) {
                $query->where('capacity', '>=', (int)$cm[1]);
            }

            if (str_contains($lower, 'projector')) {
                $query->whereJsonContains('equipment', 'projector');
            }
            if (str_contains($lower, 'ac')) {
                $query->whereJsonContains('equipment', 'AC');
            }
            if (str_contains($lower, 'smart board')) {
                $query->whereJsonContains('equipment', 'smart board');
            }
            if (str_contains($lower, 'computers') || str_contains($lower, 'computer') || str_contains($lower, 'pc')) {
                $query->whereJsonContains('equipment', 'computers');
            }

            $matchingRooms = $query->get();
            $actions[] = [
                'tool' => 'search_rooms',
                'args' => ['query' => $message],
                'result' => $matchingRooms->toArray(),
            ];

            if ($matchingRooms->isEmpty()) {
                return [
                    'response' => "No rooms found matching your criteria. Try adjusting the capacity or equipment requirements.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }

            $listStr = $matchingRooms->map(function ($r) {
                $eq = implode(', ', $r->equipment ?? []);
                return "• **Room {$r->room_number}** ({$r->type}): Capacity {$r->capacity}, Equipment: [{$eq}], Status: {$r->status}";
            })->implode("\n");

            return [
                'response' => "Here are the matching rooms based on the live database:\n\n" . $listStr,
                'actions' => $actions,
                'source' => 'live_agent',
            ];
        }

        // 5. Next class / today's class / day schedule queries
        if (str_contains($lower, 'class') || str_contains($lower, 'schedule') || str_contains($lower, 'timetable') || str_contains($lower, 'lecture')) {
            $days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
            $targetDay = null;
            foreach ($days as $d) {
                if (str_contains($lower, $d)) {
                    $targetDay = ucfirst($d);
                    break;
                }
            }

            // Check if specific course is mentioned
            if (preg_match('/(cse\s*\d{4}|ipe\s*\d{4})/i', $message, $courseMatch)) {
                $cCode = strtoupper($courseMatch[1]);
                $cCode = preg_replace('/\s+/', ' ', $cCode);
                $sch = Schedule::where('course', 'like', "%$cCode%")->get();
                $actions[] = ['tool' => 'get_schedules', 'args' => ['course' => $cCode], 'result' => $sch->toArray()];
                
                // Also check announcements for any recent reschedule/cancellation
                $announcements = Announcement::where('title', 'like', "%$cCode%")
                    ->orWhere('body', 'like', "%$cCode%")
                    ->orderByDesc('date')
                    ->get();

                $annNotice = "";
                if ($announcements->isNotEmpty()) {
                    $latestAnn = $announcements->first();
                    $annNotice = "\n\n **Latest Notice Regarding {$cCode}:**\n> {$latestAnn->title}: {$latestAnn->body}";
                }

                if ($sch->isEmpty()) {
                    return [
                        'response' => "No timetable schedule found for {$cCode}." . $annNotice,
                        'actions' => $actions,
                        'source' => 'live_agent',
                    ];
                }

                $schList = $sch->map(function ($s) {
                    return "• **{$s->course}** ({$s->title}) — {$s->day} from {$s->start_time} to {$s->end_time} in **Room {$s->room}** (Instructor: {$s->instructor}, Sec: {$s->section})";
                })->implode("\n");

                return [
                    'response' => "Here is the schedule for **{$cCode}**:\n\n" . $schList . $annNotice,
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }

            if ($targetDay) {
                $daySchedules = Schedule::where('day', $targetDay)->orderBy('start_time')->get();
                $actions[] = ['tool' => 'get_schedules', 'args' => ['day' => $targetDay], 'result' => $daySchedules->toArray()];
                if ($daySchedules->isEmpty()) {
                    return [
                        'response' => "You have no classes scheduled on {$targetDay}.",
                        'actions' => $actions,
                        'source' => 'live_agent',
                    ];
                }
                $list = $daySchedules->map(function ($s) {
                    return "• **{$s->start_time} - {$s->end_time}**: {$s->course} ({$s->title}) in **Room {$s->room}** (Instructor: {$s->instructor})";
                })->implode("\n");
                return [
                    'response' => "Here is your class schedule for **{$targetDay}**:\n\n" . $list,
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }

            // Next class (Simulated date: Friday 4 Sep, next university day is Sunday 7 Sep)
            $sundayClasses = Schedule::where('day', 'Sunday')->orderBy('start_time')->get();
            $actions[] = ['tool' => 'get_next_classes', 'args' => ['day' => 'Sunday'], 'result' => $sundayClasses->toArray()];
            
            if ($sundayClasses->isNotEmpty()) {
                $first = $sundayClasses->first();
                return [
                    'response' => "Your next scheduled class is **{$first->course} - {$first->title}** on **Sunday at {$first->start_time}** in **Room {$first->room}** (Instructor: {$first->instructor}).",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }
        }

        // 6. Assignment deadlines query (e.g., "What assignments do I have due this week?")
        if (str_contains($lower, 'assignment') || str_contains($lower, 'due') || str_contains($lower, 'deadline') || str_contains($lower, 'homework')) {
            $assignments = Assignment::orderBy('deadline')->get();
            $actions[] = ['tool' => 'get_assignments', 'args' => [], 'result' => $assignments->toArray()];

            if ($assignments->isEmpty()) {
                return [
                    'response' => "You currently have no assignments registered in the system.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }

            $list = $assignments->map(function ($a) {
                $statusBadge = $a->status === 'submitted' ? ' [Submitted]' : ($a->status === 'pending' ? ' [Pending]' : " [{$a->status}]");
                return "• **{$a->course}**: {$a->title} — Due: **{$a->deadline}** ({$a->submission_platform}){$statusBadge}";
            })->implode("\n");

            return [
                'response' => "Here are your upcoming assignments and deadlines:\n\n" . $list,
                'actions' => $actions,
                'source' => 'live_agent',
            ];
        }

        // 7. Announcements / Notices (e.g., "Show me all high priority announcements")
        if (str_contains($lower, 'announcement') || str_contains($lower, 'notice') || str_contains($lower, 'news') || str_contains($lower, 'update')) {
            $query = Announcement::query();
            if (str_contains($lower, 'high')) {
                $query->where('priority', 'high');
            } elseif (str_contains($lower, 'medium')) {
                $query->where('priority', 'medium');
            } elseif (str_contains($lower, 'low')) {
                $query->where('priority', 'low');
            }

            $announcements = $query->orderByDesc('date')->get();
            $actions[] = ['tool' => 'get_announcements', 'args' => [], 'result' => $announcements->toArray()];

            if ($announcements->isEmpty()) {
                return [
                    'response' => "There are no announcements matching your request.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }

            $list = $announcements->map(function ($a) {
                return "• **[{$a->priority}] {$a->title}** ({$a->date} by {$a->posted_by})\n  _{$a->body}_\n  _Expires: {$a->expires}_";
            })->implode("\n\n");

            return [
                'response' => "Here are the latest announcements from the live database:\n\n" . $list,
                'actions' => $actions,
                'source' => 'live_agent',
            ];
        }

        // 8. Events query (e.g., "I'm free until 2 PM — is there anything on campus I could drop into?")
        if (str_contains($lower, 'event') || str_contains($lower, 'free') || str_contains($lower, 'drop into') || str_contains($lower, 'happening')) {
            $events = Event::whereIn('status', ['upcoming', 'ongoing'])->orderBy('date')->orderBy('start_time')->get();
            $actions[] = ['tool' => 'get_events', 'args' => [], 'result' => $events->toArray()];

            if ($events->isEmpty()) {
                return [
                    'response' => "There are currently no upcoming events scheduled on campus.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }

            $list = $events->map(function ($e) {
                return "• **{$e->name}** on **{$e->date}** ({$e->start_time} - {$e->end_time}) at **{$e->venue}** (Organizer: {$e->organizer}, Registered: {$e->registered}/{$e->capacity})";
            })->implode("\n");

            return [
                'response' => "Here are the upcoming campus events you can attend:\n\n" . $list,
                'actions' => $actions,
                'source' => 'live_agent',
            ];
        }

        // Default intelligent fallback: summary of campus data
        return [
            'response' => "I am CampusOS AI Assistant connected to the live database. You can ask me about class schedules, room availability, booking rooms, event registrations, assignments, and campus notices. How can I help you today?",
            'actions' => [],
            'source' => 'live_agent',
        ];
    }

    /**
     * Tool Execution Helper with RBAC
     */
    public function executeTool(string $toolName, array $args, string $role = 'student'): array
    {
        // Admin-only tools check: room booking, room cancellation, room mutation, event mutations, announcement mutations, assignment mutations
        $adminTools = [
            'book_room',
            'cancel_room_booking',
            'create_room',
            'update_room',
            'delete_room',
            'create_event',
            'delete_event',
            'create_announcement',
            'delete_announcement',
            'create_assignment',
            'delete_assignment',
            'update_room_capacity'
        ];

        if (in_array($toolName, $adminTools) && $role !== 'admin') {
            return [
                'success' => false,
                'status_code' => 403,
                'message' => "HTTP 403 Forbidden: Action '{$toolName}' requires 'admin' role privileges. Students cannot book rooms or manage room allocations. Current role is '{$role}'."
            ];
        }

        switch ($toolName) {
            // Tool 1: Class Schedules
            case 'get_schedule':
            case 'get_schedules':
                $q = Schedule::query();
                if (!empty($args['day'])) {
                    $q->where('day', $args['day']);
                }
                if (!empty($args['course'])) {
                    $courseVal = $args['course'];
                    $q->where(function ($sq) use ($courseVal) {
                        $sq->where('course', 'like', "%{$courseVal}%")
                           ->orWhere('title', 'like', "%{$courseVal}%");
                    });
                }
                if (!empty($args['instructor'])) {
                    $q->where('instructor', 'like', "%{$args['instructor']}%");
                }
                if (!empty($args['room'])) {
                    $q->where('room', 'like', "%{$args['room']}%");
                }
                $schedules = $q->orderBy('day')->orderBy('start_time')->get();
                return [
                    'success' => true,
                    'count' => $schedules->count(),
                    'data' => $schedules->toArray(),
                ];

            // Tool 2: Room Availability & Inventory
            case 'get_room_availability':
                $roomNum = strtoupper(trim($args['room'] ?? $args['room_number'] ?? ''));
                $date = $args['date'] ?? '2026-09-05';
                $startTime = $args['start_time'] ?? '08:00';
                $endTime = $args['end_time'] ?? '18:00';

                $room = Room::where('room_number', $roomNum)->orWhere('id', $roomNum)->first();
                if (!$room) {
                    return [
                        'success' => false,
                        'available' => false,
                        'message' => "Room {$roomNum} does not exist in the database."
                    ];
                }

                $bookings = $room->bookings ?? [];
                $conflicts = [];
                foreach ($bookings as $b) {
                    if (($b['date'] ?? '') === $date) {
                        $bStart = $b['start_time'] ?? '00:00';
                        $bEnd = $b['end_time'] ?? '23:59';
                        if ($startTime < $bEnd && $endTime > $bStart) {
                            $conflicts[] = $b;
                        }
                    }
                }

                $isAvailable = empty($conflicts) && $room->status === 'available';

                return [
                    'success' => true,
                    'room_number' => $room->room_number,
                    'type' => $room->type,
                    'capacity' => $room->capacity,
                    'equipment' => $room->equipment ?? [],
                    'status' => $room->status,
                    'date' => $date,
                    'requested_slot' => "{$startTime} - {$endTime}",
                    'available' => $isAvailable,
                    'conflicts' => $conflicts,
                    'all_bookings_on_date' => array_values(array_filter($bookings, fn($b) => ($b['date'] ?? '') === $date)),
                ];

            case 'get_rooms':
            case 'search_rooms':
                $q = Room::query();
                if (!empty($args['type'])) {
                    $q->where('type', $args['type']);
                }
                if (!empty($args['min_capacity'])) {
                    $q->where('capacity', '>=', (int)$args['min_capacity']);
                }
                if (!empty($args['equipment'])) {
                    foreach ((array)$args['equipment'] as $eq) {
                        $eq = trim($eq);
                        if ($eq !== '') {
                            $q->whereJsonContains('equipment', $eq);
                        }
                    }
                }
                if (!empty($args['room_number'])) {
                    $q->where('room_number', 'like', "%{$args['room_number']}%");
                }
                $rooms = $q->orderBy('room_number')->get();
                return [
                    'success' => true,
                    'count' => $rooms->count(),
                    'data' => $rooms->toArray(),
                ];

            // Tool 3: Campus Events
            case 'get_events':
                $q = Event::query();
                if (!empty($args['upcoming_only'])) {
                    $q->whereIn('status', ['upcoming', 'ongoing']);
                }
                if (!empty($args['category'])) {
                    $q->where('category', $args['category']);
                }
                if (!empty($args['date'])) {
                    $q->where('date', $args['date']);
                }
                $events = $q->orderBy('date')->orderBy('start_time')->get();
                return [
                    'success' => true,
                    'count' => $events->count(),
                    'data' => $events->toArray(),
                ];

            // Tool 4: Announcements & Notices
            case 'get_announcements':
                $q = Announcement::query();
                if (!empty($args['priority'])) {
                    $q->where('priority', $args['priority']);
                }
                if (!empty($args['active_only'])) {
                    $q->where('expires', '>=', '2026-09-04');
                }
                $announcements = $q->orderByDesc('date')->get();
                return [
                    'success' => true,
                    'count' => $announcements->count(),
                    'data' => $announcements->toArray(),
                ];

            // Tool 5: Assignments & Deadlines
            case 'get_assignments':
                $q = Assignment::query();
                if (!empty($args['course'])) {
                    $q->where('course', 'like', "%{$args['course']}%");
                }
                if (!empty($args['status'])) {
                    $q->where('status', $args['status']);
                }
                if (!empty($args['upcoming_only'])) {
                    $q->where('deadline', '>=', '2026-09-04');
                }
                $assignments = $q->orderBy('deadline')->get();
                return [
                    'success' => true,
                    'count' => $assignments->count(),
                    'data' => $assignments->toArray(),
                ];

            // Tool 6: Mutation - Book Room (Admin Only)
            case 'book_room':
                $roomNum = strtoupper(trim($args['room'] ?? $args['room_number'] ?? ''));
                $date = $args['date'] ?? '2026-09-05';
                $startTime = $args['start_time'] ?? '14:00';
                $endTime = $args['end_time'] ?? '16:00';
                $purpose = $args['purpose'] ?? 'Official Department Meeting';
                $bookedBy = $args['booked_by'] ?? 'Campus Administrator';

                $room = Room::where('room_number', $roomNum)->orWhere('id', $roomNum)->first();
                if (!$room) {
                    return [
                        'success' => false,
                        'message' => "Room {$roomNum} does not exist in the database."
                    ];
                }

                $bookings = $room->bookings ?? [];

                // Check clash detection
                foreach ($bookings as $b) {
                    if (($b['date'] ?? '') === $date) {
                        $existingStart = $b['start_time'] ?? '00:00';
                        $existingEnd = $b['end_time'] ?? '23:59';
                        if ($startTime < $existingEnd && $endTime > $existingStart) {
                            return [
                                'success' => false,
                                'clash' => true,
                                'message' => "Time Conflict: Room {$room->room_number} is already booked on {$date} from {$existingStart} to {$existingEnd} for '{$b['purpose']}' ({$b['booked_by']})."
                            ];
                        }
                    }
                }

                $newBooking = [
                    'booking_id' => 'bk-' . Str::random(6),
                    'booked_by' => $bookedBy,
                    'date' => $date,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'purpose' => $purpose,
                ];

                $bookings[] = $newBooking;
                $room->bookings = $bookings;
                $room->save();

                return [
                    'success' => true,
                    'confirmed_by_db' => true,
                    'message' => "Successfully booked Room {$room->room_number} on {$date} ({$startTime} - {$endTime}).",
                    'booking' => $newBooking,
                    'room' => $room->toArray(),
                ];

            // Tool 7: Mutation - Cancel Room Booking (Admin Only)
            case 'cancel_room_booking':
                $roomNum = strtoupper(trim($args['room'] ?? $args['room_number'] ?? ''));
                $bookingId = $args['booking_id'] ?? null;
                $date = $args['date'] ?? null;
                $startTime = $args['start_time'] ?? null;

                $room = Room::where('room_number', $roomNum)->orWhere('id', $roomNum)->first();
                if (!$room) {
                    return [
                        'success' => false,
                        'message' => "Room {$roomNum} does not exist."
                    ];
                }

                $bookings = $room->bookings ?? [];
                $found = false;
                $updated = [];
                $cancelledBooking = null;

                foreach ($bookings as $b) {
                    $matchesId = $bookingId && (($b['booking_id'] ?? '') === $bookingId);
                    $matchesSlot = $date && (($b['date'] ?? '') === $date) && (!$startTime || ($b['start_time'] ?? '') === $startTime);

                    if (!$found && ($matchesId || $matchesSlot)) {
                        $found = true;
                        $cancelledBooking = $b;
                    } else {
                        $updated[] = $b;
                    }
                }

                if (!$found) {
                    return [
                        'success' => false,
                        'message' => "No matching booking found for Room {$room->room_number} to cancel."
                    ];
                }

                $room->bookings = $updated;
                $room->save();

                return [
                    'success' => true,
                    'confirmed_by_db' => true,
                    'message' => "Successfully cancelled booking for Room {$room->room_number}.",
                    'cancelled_booking' => $cancelledBooking,
                ];

            // Student Event Registration Tool
            case 'register_for_event':
                $event = Event::find($args['event_id'] ?? '') ?: Event::where('name', 'like', "%" . ($args['event_name'] ?? '') . "%")->first();
                if (!$event) {
                    return ['success' => false, 'message' => 'Event not found'];
                }
                if ($event->registered >= $event->capacity) {
                    return ['success' => false, 'message' => "Event '{$event->name}' is already full (Capacity: {$event->capacity})."];
                }

                $regs = $event->registrations ?? [];
                $studentId = $args['student_id'] ?? '22-45123';
                foreach ($regs as $r) {
                    if (($r['student_id'] ?? '') === $studentId) {
                        return ['success' => false, 'message' => "You are already registered for '{$event->name}'."];
                    }
                }
                $regs[] = ['student_id' => $studentId, 'name' => $args['name'] ?? 'Current Student'];
                $event->registrations = $regs;
                $event->registered = count($regs);
                if ($event->registered >= $event->capacity) {
                    $event->status = 'full';
                }
                $event->save();
                return [
                    'success' => true,
                    'message' => "Successfully registered for {$event->name}!",
                    'event' => $event->toArray(),
                ];

            default:
                return [
                    'success' => false,
                    'message' => "Unknown tool: {$toolName}"
                ];
        }
    }

    private function parseTime(string $h, string $m, string $ampm): string
    {
        $hour = (int)$h;
        $ampm = strtolower(trim($ampm));
        if ($ampm === 'pm' && $hour < 12) $hour += 12;
        if ($ampm === 'am' && $hour === 12) $hour = 0;
        return sprintf('%02d:%02d', $hour, (int)$m);
    }

    /**
     * Gemini Function Declarations Specification
     */
    private function getGeminiToolsDefinition(): array
    {
        return [
            [
                'function_declarations' => [
                    [
                        'name' => 'get_schedule',
                        'description' => 'Query live university class timetables and schedules filtered by day of week, course code/title, instructor, or room.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'day' => [
                                    'type' => 'STRING',
                                    'description' => 'Day of the week: Sunday, Monday, Tuesday, Wednesday, Thursday'
                                ],
                                'course' => [
                                    'type' => 'STRING',
                                    'description' => 'Course code (e.g. CSE 4113) or course title (e.g. Computer Graphics)'
                                ],
                                'instructor' => [
                                    'type' => 'STRING',
                                    'description' => 'Instructor name'
                                ],
                                'room' => [
                                    'type' => 'STRING',
                                    'description' => 'Room number (e.g. 7A03)'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'get_room_availability',
                        'description' => 'Check exact live availability and conflict details for a specific university room on a given date and time range.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'required' => ['room'],
                            'properties' => [
                                'room' => [
                                    'type' => 'STRING',
                                    'description' => 'Room number (e.g. 7A03, 7B01, 7C02)'
                                ],
                                'date' => [
                                    'type' => 'STRING',
                                    'description' => 'Date in YYYY-MM-DD format (e.g. 2026-09-05)'
                                ],
                                'start_time' => [
                                    'type' => 'STRING',
                                    'description' => 'Start time in 24h HH:MM format (e.g. 14:00)'
                                ],
                                'end_time' => [
                                    'type' => 'STRING',
                                    'description' => 'End time in 24h HH:MM format (e.g. 16:00)'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'search_rooms',
                        'description' => 'Search and filter campus rooms by type (classroom, lab, seminar), minimum capacity, or required equipment (e.g. projector, AC, whiteboard).',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'type' => [
                                    'type' => 'STRING',
                                    'description' => 'Room type: classroom, lab, or seminar'
                                ],
                                'min_capacity' => [
                                    'type' => 'INTEGER',
                                    'description' => 'Minimum capacity required'
                                ],
                                'equipment' => [
                                    'type' => 'ARRAY',
                                    'items' => ['type' => 'STRING'],
                                    'description' => 'List of equipment items, e.g. ["projector", "AC"]'
                                ],
                                'room_number' => [
                                    'type' => 'STRING',
                                    'description' => 'Room code query'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'get_events',
                        'description' => 'Query live university campus events, workshops, hackathons, and guest lectures.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'upcoming_only' => [
                                    'type' => 'BOOLEAN',
                                    'description' => 'Set to true to only fetch upcoming/ongoing events'
                                ],
                                'category' => [
                                    'type' => 'STRING',
                                    'description' => 'Event category filter'
                                ],
                                'date' => [
                                    'type' => 'STRING',
                                    'description' => 'Specific date in YYYY-MM-DD format'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'get_announcements',
                        'description' => 'Get departmental notices, official circulars, and campus bulletins.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'priority' => [
                                    'type' => 'STRING',
                                    'description' => 'Priority level: high, medium, or low'
                                ],
                                'active_only' => [
                                    'type' => 'BOOLEAN',
                                    'description' => 'Filter out expired notices'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'get_assignments',
                        'description' => 'Query course assignments, deadlines, submission platforms, and status from the live database.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'course' => [
                                    'type' => 'STRING',
                                    'description' => 'Course code filter'
                                ],
                                'status' => [
                                    'type' => 'STRING',
                                    'description' => 'Status filter: pending, submitted, graded, late'
                                ],
                                'upcoming_only' => [
                                    'type' => 'BOOLEAN',
                                    'description' => 'Set to true to only view pending/due assignments'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'register_for_event',
                        'description' => 'Register a student for an upcoming campus event.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'event_id' => ['type' => 'STRING'],
                                'event_name' => ['type' => 'STRING'],
                                'student_id' => ['type' => 'STRING'],
                                'name' => ['type' => 'STRING']
                            ]
                        ]
                    ],
                    [
                        'name' => 'book_room',
                        'description' => 'MUTATION (Admin Only): Book a university room slot. Requires Admin privileges.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'required' => ['room', 'date', 'start_time', 'end_time', 'purpose'],
                            'properties' => [
                                'room' => [
                                    'type' => 'STRING',
                                    'description' => 'Room number (e.g. 7A03)'
                                ],
                                'date' => [
                                    'type' => 'STRING',
                                    'description' => 'Booking date in YYYY-MM-DD format'
                                ],
                                'start_time' => [
                                    'type' => 'STRING',
                                    'description' => 'Start time in 24h format HH:MM'
                                ],
                                'end_time' => [
                                    'type' => 'STRING',
                                    'description' => 'End time in 24h format HH:MM'
                                ],
                                'purpose' => [
                                    'type' => 'STRING',
                                    'description' => 'Purpose of booking'
                                ],
                                'booked_by' => [
                                    'type' => 'STRING',
                                    'description' => 'Name or department booking the room'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'cancel_room_booking',
                        'description' => 'MUTATION (Admin Only): Cancel an existing room reservation. Requires Admin privileges.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'required' => ['room'],
                            'properties' => [
                                'room' => [
                                    'type' => 'STRING',
                                    'description' => 'Room number'
                                ],
                                'booking_id' => [
                                    'type' => 'STRING',
                                    'description' => 'Booking ID to cancel (e.g. bk-001)'
                                ],
                                'date' => [
                                    'type' => 'STRING',
                                    'description' => 'Date in YYYY-MM-DD'
                                ],
                                'start_time' => [
                                    'type' => 'STRING',
                                    'description' => 'Start time HH:MM'
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ];
    }

    /**
     * OpenAI Tools Specification
     */
    private function getOpenAIToolsDefinition(): array
    {
        $geminiTools = $this->getGeminiToolsDefinition()[0]['function_declarations'];
        $openAiTools = [];
        foreach ($geminiTools as $gt) {
            $openAiTools[] = [
                'type' => 'function',
                'function' => [
                    'name' => $gt['name'],
                    'description' => $gt['description'],
                    'parameters' => $gt['parameters'] ?? ['type' => 'object', 'properties' => []],
                ]
            ];
        }
        return $openAiTools;
    }
}
