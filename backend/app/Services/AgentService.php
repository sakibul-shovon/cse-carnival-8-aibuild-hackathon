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
    public function processQuery(string $message, array $history = []): array
    {
        $openaiKey = env('OPENAI_API_KEY');
        $geminiKey = env('GEMINI_API_KEY') ?: env('GOOGLE_API_KEY');
        $groqKey = env('GROQ_API_KEY');

        if ($openaiKey && !str_starts_with($openaiKey, 'your_')) {
            return $this->processWithOpenAI($message, $history, $openaiKey);
        }

        if ($groqKey && !str_starts_with($groqKey, 'your_')) {
            return $this->processWithGroq($message, $history, $groqKey);
        }

        if ($geminiKey && !str_starts_with($geminiKey, 'your_')) {
            return $this->processWithGemini($message, $history, $geminiKey);
        }

        // Deterministic Fallback Tool Execution engine if no API key is provided
        return $this->processWithLocalEngine($message);
    }

    /**
     * OpenAI Function / Tool Calling Implementation
     */
    private function processWithOpenAI(string $message, array $history, string $apiKey): array
    {
        $tools = $this->getToolsDefinition();
        $messages = [
            [
                'role' => 'system',
                'content' => "You are CampusOS AI Agent — an intelligent university assistant for AUST (Ahsanullah University of Science and Technology). 
Current Simulated Date: Friday, September 4, 2026.
You have tools to read, search, book rooms, register for events, and fetch live data from the database.
Always query the live database using your tools.
For ambiguous or vague requests (e.g. 'book me any room tomorrow'), do NOT book immediately — ask clarification for exact time and room.
Refuse unauthorized destructive requests.
Keep your answers helpful, clear, and accurate."
            ]
        ];

        foreach ($history as $h) {
            $messages[] = [
                'role' => $h['role'] === 'assistant' ? 'assistant' : 'user',
                'content' => $h['content'],
            ];
        }
        $messages[] = ['role' => 'user', 'content' => $message];

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer $apiKey",
                'Content-Type' => 'application/json',
            ])->timeout(30)->post('https://api.openai.com/v1/chat/completions', [
                'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
                'messages' => $messages,
                'tools' => $tools,
                'tool_choice' => 'auto',
            ]);

            if (!$response->successful()) {
                Log::error('OpenAI Error', ['body' => $response->body()]);
                return $this->processWithLocalEngine($message);
            }

            $resData = $response->json();
            $choice = $resData['choices'][0]['message'] ?? null;
            if (!$choice) {
                return $this->processWithLocalEngine($message);
            }

            $executedActions = [];
            if (!empty($choice['tool_calls'])) {
                $messages[] = $choice;
                foreach ($choice['tool_calls'] as $toolCall) {
                    $funcName = $toolCall['function']['name'];
                    $args = json_decode($toolCall['function']['arguments'], true) ?? [];
                    $toolResult = $this->executeTool($funcName, $args);
                    $executedActions[] = [
                        'tool' => $funcName,
                        'args' => $args,
                        'result' => $toolResult,
                    ];
                    $messages[] = [
                        'role' => 'tool',
                        'tool_call_id' => $toolCall['id'],
                        'content' => json_encode($toolResult),
                    ];
                }

                // Second call to get final answer
                $secondResponse = Http::withHeaders([
                    'Authorization' => "Bearer $apiKey",
                    'Content-Type' => 'application/json',
                ])->timeout(30)->post('https://api.openai.com/v1/chat/completions', [
                    'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
                    'messages' => $messages,
                ]);

                if ($secondResponse->successful()) {
                    $secondData = $secondResponse->json();
                    $reply = $secondData['choices'][0]['message']['content'] ?? 'Done.';
                    return [
                        'response' => $reply,
                        'actions' => $executedActions,
                        'source' => 'openai_llm',
                    ];
                }
            }

            return [
                'response' => $choice['content'] ?? 'I have processed your request.',
                'actions' => $executedActions,
                'source' => 'openai_llm',
            ];
        } catch (\Throwable $e) {
            Log::error('OpenAI Exception: ' . $e->getMessage());
            return $this->processWithLocalEngine($message);
        }
    }

    /**
     * Groq Function Calling Implementation
     */
    private function processWithGroq(string $message, array $history, string $apiKey): array
    {
        $tools = $this->getToolsDefinition();
        $messages = [
            [
                'role' => 'system',
                'content' => "You are CampusOS AI Agent for AUST. Current simulated date is 2026-09-04. Always use tools to query database. For vague requests ask clarification."
            ]
        ];
        foreach ($history as $h) {
            $messages[] = ['role' => $h['role'] === 'assistant' ? 'assistant' : 'user', 'content' => $h['content']];
        }
        $messages[] = ['role' => 'user', 'content' => $message];

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer $apiKey",
                'Content-Type' => 'application/json',
            ])->timeout(30)->post('https://api.groq.com/openai/v1/chat/completions', [
                'model' => 'llama-3.3-70b-versatile',
                'messages' => $messages,
                'tools' => $tools,
                'tool_choice' => 'auto',
            ]);

            if ($response->successful()) {
                $resData = $response->json();
                $choice = $resData['choices'][0]['message'] ?? null;
                if ($choice && !empty($choice['tool_calls'])) {
                    $executedActions = [];
                    $messages[] = $choice;
                    foreach ($choice['tool_calls'] as $toolCall) {
                        $funcName = $toolCall['function']['name'];
                        $args = json_decode($toolCall['function']['arguments'], true) ?? [];
                        $toolResult = $this->executeTool($funcName, $args);
                        $executedActions[] = [
                            'tool' => $funcName,
                            'args' => $args,
                            'result' => $toolResult,
                        ];
                        $messages[] = [
                            'role' => 'tool',
                            'tool_call_id' => $toolCall['id'],
                            'content' => json_encode($toolResult),
                        ];
                    }

                    $secondResponse = Http::withHeaders([
                        'Authorization' => "Bearer $apiKey",
                        'Content-Type' => 'application/json',
                    ])->timeout(30)->post('https://api.groq.com/openai/v1/chat/completions', [
                        'model' => 'llama-3.3-70b-versatile',
                        'messages' => $messages,
                    ]);

                    if ($secondResponse->successful()) {
                        $secondData = $secondResponse->json();
                        return [
                            'response' => $secondData['choices'][0]['message']['content'] ?? 'Done.',
                            'actions' => $executedActions,
                            'source' => 'groq_llm',
                        ];
                    }
                } elseif ($choice) {
                    return [
                        'response' => $choice['content'],
                        'actions' => [],
                        'source' => 'groq_llm',
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::error('Groq Error: ' . $e->getMessage());
        }

        return $this->processWithLocalEngine($message);
    }

    /**
     * Gemini Implementation
     */
    private function processWithGemini(string $message, array $history, string $apiKey): array
    {
        // Fallback to local engine for reliable function handling or local query resolution
        return $this->processWithLocalEngine($message);
    }

    /**
     * Deterministic and robust Natural Language Query Engine reading live SQLite database state
     */
    public function processWithLocalEngine(string $message): array
    {
        $lower = strtolower(trim($message));
        $actions = [];

        // 1. Vague room booking check
        if ((str_contains($lower, 'book me any room') || str_contains($lower, 'book a room for me') || str_contains($lower, 'just book')) && !preg_match('/\b7[a-c]\d{2}\b/i', $lower) && !preg_match('/\b\d{1,2}(:\d{2})?\s*(am|pm)?\s*(to|-)\s*\d{1,2}(:\d{2})?\s*(am|pm)?\b/i', $lower)) {
            return [
                'response' => "To book a room for you, please specify the exact room number (e.g. 7A02, 7C01), the date, start time, and end time (e.g., 'Book Room 7A02 tomorrow from 3 PM to 5 PM').",
                'actions' => [],
                'source' => 'live_agent',
            ];
        }

        // 2. Specific room booking action (e.g. "Book Room 7A02 tomorrow from 3 PM to 5 PM")
        if (preg_match('/book\s+(?:room\s+)?(7[A-C]\d{2})/i', $message, $roomMatch)) {
            $roomNum = strtoupper($roomMatch[1]);
            $room = Room::where('room_number', $roomNum)->first();
            if (!$room) {
                return [
                    'response' => "Room {$roomNum} does not exist in the database.",
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
                'room_number' => $roomNum,
                'booked_by' => 'Student (CampusOS User)',
                'date' => $date,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'purpose' => 'Study / Meeting Booking',
            ]);

            $actions[] = [
                'tool' => 'book_room',
                'args' => ['room_number' => $roomNum, 'date' => $date, 'start_time' => $startTime, 'end_time' => $endTime],
                'result' => $bookingRes,
            ];

            if ($bookingRes['success']) {
                return [
                    'response' => " Successfully booked Room {$roomNum} on {$date} from {$startTime} to {$endTime}. Booking ID: {$bookingRes['booking']['booking_id']}.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            } else {
                return [
                    'response' => " Could not book Room {$roomNum}: {$bookingRes['message']}",
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
     * Tool Execution Helper
     */
    public function executeTool(string $toolName, array $args): array
    {
        switch ($toolName) {
            case 'get_schedules':
                $q = Schedule::query();
                if (!empty($args['day'])) $q->where('day', $args['day']);
                if (!empty($args['course'])) $q->where('course', 'like', "%{$args['course']}%");
                return ['success' => true, 'data' => $q->get()->toArray()];

            case 'get_rooms':
            case 'search_rooms':
                $q = Room::query();
                if (!empty($args['type'])) $q->where('type', $args['type']);
                if (!empty($args['min_capacity'])) $q->where('capacity', '>=', (int)$args['min_capacity']);
                if (!empty($args['equipment'])) {
                    foreach ((array)$args['equipment'] as $eq) {
                        $q->whereJsonContains('equipment', $eq);
                    }
                }
                return ['success' => true, 'data' => $q->get()->toArray()];

            case 'book_room':
                $room = Room::where('room_number', $args['room_number'] ?? '')->first();
                if (!$room) return ['success' => false, 'message' => 'Room not found'];
                $bookings = $room->bookings ?? [];
                
                // Clash check
                foreach ($bookings as $b) {
                    if (($b['date'] ?? '') === ($args['date'] ?? '')) {
                        if (($args['start_time'] ?? '') < ($b['end_time'] ?? '') && ($args['end_time'] ?? '') > ($b['start_time'] ?? '')) {
                            return ['success' => false, 'message' => "Clash with existing booking for '{$b['purpose']}'"];
                        }
                    }
                }

                $newBk = [
                    'booking_id' => 'bk-' . Str::random(6),
                    'booked_by' => $args['booked_by'] ?? 'Student',
                    'date' => $args['date'] ?? '2026-09-05',
                    'start_time' => $args['start_time'] ?? '14:00',
                    'end_time' => $args['end_time'] ?? '16:00',
                    'purpose' => $args['purpose'] ?? 'General booking',
                ];
                $bookings[] = $newBk;
                $room->bookings = $bookings;
                $room->save();
                return ['success' => true, 'booking' => $newBk, 'room' => $room->toArray()];

            case 'register_for_event':
                $event = Event::find($args['event_id'] ?? '') ?: Event::where('name', 'like', "%{$args['event_name']}%")->first();
                if (!$event) return ['success' => false, 'message' => 'Event not found'];
                if ($event->registered >= $event->capacity) return ['success' => false, 'message' => 'Event is full'];

                $regs = $event->registrations ?? [];
                $studentId = $args['student_id'] ?? '20-40532';
                foreach ($regs as $r) {
                    if (($r['student_id'] ?? '') === $studentId) {
                        return ['success' => false, 'message' => 'Already registered'];
                    }
                }
                $regs[] = ['student_id' => $studentId, 'name' => $args['name'] ?? 'Student'];
                $event->registrations = $regs;
                $event->registered = count($regs);
                if ($event->registered >= $event->capacity) $event->status = 'full';
                $event->save();
                return ['success' => true, 'event' => $event->toArray()];

            case 'get_announcements':
                $q = Announcement::query();
                if (!empty($args['priority'])) $q->where('priority', $args['priority']);
                return ['success' => true, 'data' => $q->orderByDesc('date')->get()->toArray()];

            case 'get_assignments':
                return ['success' => true, 'data' => Assignment::orderBy('deadline')->get()->toArray()];

            default:
                return ['success' => false, 'message' => 'Unknown tool'];
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

    private function getToolsDefinition(): array
    {
        return [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_schedules',
                    'description' => 'Get class timetable schedules filtered by course, day, or room.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'day' => ['type' => 'string', 'enum' => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']],
                            'course' => ['type' => 'string'],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'search_rooms',
                    'description' => 'Find available rooms with capacity, type, and equipment filters.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'type' => ['type' => 'string', 'enum' => ['classroom', 'lab', 'seminar']],
                            'min_capacity' => ['type' => 'integer'],
                            'equipment' => ['type' => 'array', 'items' => ['type' => 'string']],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'book_room',
                    'description' => 'Book a university room for a specific date and time slot.',
                    'parameters' => [
                        'type' => 'object',
                        'required' => ['room_number', 'date', 'start_time', 'end_time', 'booked_by', 'purpose'],
                        'properties' => [
                            'room_number' => ['type' => 'string'],
                            'date' => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                            'start_time' => ['type' => 'string', 'description' => 'HH:MM in 24h'],
                            'end_time' => ['type' => 'string', 'description' => 'HH:MM in 24h'],
                            'booked_by' => ['type' => 'string'],
                            'purpose' => ['type' => 'string'],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'register_for_event',
                    'description' => 'Register a student for a campus event.',
                    'parameters' => [
                        'type' => 'object',
                        'required' => ['event_id', 'student_id', 'name'],
                        'properties' => [
                            'event_id' => ['type' => 'string'],
                            'student_id' => ['type' => 'string'],
                            'name' => ['type' => 'string'],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_announcements',
                    'description' => 'Get campus notices and announcements.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'priority' => ['type' => 'string', 'enum' => ['high', 'medium', 'low']],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_assignments',
                    'description' => 'Get assignment deadlines and submission statuses.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [],
                    ],
                ],
            ],
        ];
    }
}
