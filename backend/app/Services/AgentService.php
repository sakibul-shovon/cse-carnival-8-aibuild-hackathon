<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\Event;
use App\Models\Room;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AgentService
{
    /**
     * Process natural language queries with live tools calling against the database.
     */
    public function processQuery(string $message, array $history = [], string $role = 'student', ?User $user = null): array
    {
        $geminiKey = env('GEMINI_API_KEY') ?: env('GOOGLE_API_KEY');
        $openaiKey = env('OPENAI_API_KEY');
        $groqKey = env('GROQ_API_KEY');

        // 1. Primary: Real Google Gemini Function/Tool Calling Engine
        if ($geminiKey && !str_starts_with($geminiKey, 'your_')) {
            return $this->processWithGemini($message, $history, $geminiKey, $role, $user);
        }

        // 2. Secondary: OpenAI
        if ($openaiKey && !str_starts_with($openaiKey, 'your_')) {
            return $this->processWithOpenAI($message, $history, $openaiKey, $role, $user);
        }

        // 3. Tertiary: Groq
        if ($groqKey && !str_starts_with($groqKey, 'your_')) {
            return $this->processWithGroq($message, $history, $groqKey, $role, $user);
        }

        // 4. Deterministic Fallback Tool Execution engine if no API key is provided
        return $this->processWithLocalEngine($message, $role, $history, $user);
    }

    /**
     * Get the reference/simulated now Carbon instance from centralized configuration
     */
    public static function getReferenceNow(): \Carbon\Carbon
    {
        $date = config('app.campus.simulated_date') ?: env('CAMPUS_SIMULATED_DATE', '2026-09-04');
        $time = config('app.campus.simulated_time') ?: env('CAMPUS_SIMULATED_TIME', '18:24:00');
        $timezone = config('app.campus.timezone') ?: env('CAMPUS_TIMEZONE', 'Asia/Dhaka');

        return \Carbon\Carbon::parse("{$date} {$time}", $timezone);
    }

    /**
     * Google Gemini Live Function/Tool Calling Implementation
     */
    private function processWithGemini(string $message, array $history, string $apiKey, string $role = 'student', ?User $user = null): array
    {
        $model = env('GEMINI_MODEL', 'gemini-2.5-flash');
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        $refNow = self::getReferenceNow();
        $refDateStr = $refNow->format('Y-m-d');
        $refDayName = $refNow->format('l'); // Friday

        $userName = $user?->name ?? ($role === 'teacher' ? 'Faculty Member' : ($role === 'admin' ? 'Administrator' : 'Student'));
        $userEmail = $user?->email ?? 'user@campusos.com';

        $systemInstruction = "You are CampusOS AI Agent — the official intelligent operations assistant for Ahsanullah University of Science and Technology (AUST).
Current Reference Date & Time: {$refNow->format('l, F j, Y g:i A')} ({$refDateStr}, {$refDayName}) [Timezone: Asia/Dhaka].
Current Authenticated User: {$userName} ({$userEmail}) | Role: {$role}.

CRITICAL SYSTEM RULES:
1. The LIVE SQLite/MySQL database is the absolute SINGLE SOURCE OF TRUTH. Never invent, hallucinate, assume, or guess schedules, courses, rooms, events, announcements, assignments, or booking statuses.
2. CONVERSATIONAL CONTEXT AWARENESS & FOLLOW-UPS:
   - Always maintain and utilize conversation history to interpret follow-up questions (e.g., 'why', 'why not', 'what time?', 'where?', 'and tomorrow?', 'what about tuesday?').
   - If the user asks 'why' or 'why not' after receiving a schedule result (e.g. 'No timetable schedule found for Test on Monday'), query the live database with `get_schedule` for that course and explain when/where the course is actually scheduled.
3. TEACHER ACTIONS & MISSING INFORMATION FLOW:
   - When a Teacher asks to create an assignment (e.g. 'Create an assignment for CSE321'):
     * If title or deadline is missing, DO NOT call `create_assignment` yet. Politely ask: 'What should the assignment title and deadline be?'
     * Once title and deadline are provided (e.g. 'Assignment 1, deadline September 15'), call `create_assignment` with course, title, deadline.
     * Teacher CANNOT create assignments for another teacher's course.
   - When a Teacher asks to create an announcement (e.g. 'Create an announcement for CSE321 saying tomorrow's class is cancelled'), call `create_announcement`.
   - When a Teacher asks to create an event (e.g. 'Create an event called AI Workshop tomorrow at 2 PM with capacity 50'), call `create_event`. If date, time, or capacity is missing, ask for clarification.
4. ROLE-BASED ACCESS CONTROL (RBAC):
   - 'student' role: Can use read tools (get_schedule, get_next_classes, get_room_availability, get_room_available_slots, get_room_available_days, search_rooms, get_events, get_announcements, get_assignments, get_courses, register_for_event, enroll_course, drop_course).
   - 'student' role: CANNOT book rooms, cancel room bookings, reschedule classes (`update_schedule`), or create assignments/events/announcements. Refuse politely with role limitation explanation.
   - 'teacher' role: Can create assignments (`create_assignment`), create announcements (`create_announcement`), create events (`create_event`), update own schedules (`update_schedule`), and use all read tools. Cannot book physical rooms.
   - 'admin' role: Has full access to all read and mutation tools (`update_schedule`, `book_room`, `cancel_room_booking`, `create_assignment`, `create_event`, `create_announcement`).
5. Keep replies concise, helpful, and properly formatted with markdown bullet points.";

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
                $functionCalls = [];
                $finalText = '';

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

                // Format modelContent parts to ensure functionCall args is an associative object/dictionary
                $sanitizedModelParts = [];
                foreach ($modelContent['parts'] as $part) {
                    if (!empty($part['functionCall'])) {
                        $fcObj = [
                            'name' => $part['functionCall']['name'],
                            'args' => (object)($part['functionCall']['args'] ?? []),
                        ];
                        $functionCalls[] = $part['functionCall'];
                        $sanitizedModelParts[] = ['functionCall' => $fcObj];
                    }
                    if (!empty($part['text'])) {
                        $finalText .= $part['text'];
                        $sanitizedModelParts[] = ['text' => $part['text']];
                    }
                }
                $contents[] = [
                    'role' => 'model',
                    'parts' => $sanitizedModelParts,
                ];

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
                    $toolResult = $this->executeTool($toolName, $args, $role, $user);

                    $executedActions[] = [
                        'tool' => $toolName,
                        'args' => $args,
                        'result' => $toolResult,
                    ];

                    $responseParts[] = [
                        'functionResponse' => [
                            'name' => $toolName,
                            'response' => [
                                'result' => $toolResult,
                            ],
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

        return $this->processWithLocalEngine($message, $role, $history, $user);
    }

    /**
     * Deterministic and robust Natural Language Query Engine reading live MySQL/DB state
     */
    public function processWithLocalEngine(string $message, string $role = 'student', array $history = [], ?User $user = null): array
    {
        $lower = strtolower(trim($message));
        $actions = [];
        $weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        // --- Context Extraction from History ---
        $contextCourse = null;
        $contextDay = null;
        $contextRoom = null;
        $dbCourses = Schedule::select('course')->distinct()->pluck('course')->toArray();
        $catCourses = Course::pluck('course_code')->toArray();
        $allCoursesInDb = array_values(array_unique(array_filter(array_merge($dbCourses, $catCourses))));

        // Search backwards in history for context
        for ($i = count($history) - 1; $i >= 0; $i--) {
            $hContent = (string)($history[$i]['content'] ?? '');
            if (!$contextCourse) {
                foreach ($allCoursesInDb as $c) {
                    if (stripos($hContent, $c) !== false) {
                        $contextCourse = $c;
                        break;
                    }
                }
                if (!$contextCourse && preg_match('/\b(test|cse\s*\d{3,4}|ipe\s*\d{3,4})\b/i', $hContent, $cm)) {
                    $contextCourse = strtoupper(trim($cm[1]));
                }
            }
            if (!$contextDay) {
                foreach ($weekdays as $d) {
                    if (preg_match('/\b' . $d . '\b/i', $hContent)) {
                        $contextDay = ucfirst($d);
                        break;
                    }
                }
            }
            if (!$contextRoom) {
                if (preg_match('/\b(7[A-C]\d{2})\b/i', $hContent, $rm)) {
                    $contextRoom = strtoupper($rm[1]);
                }
            }
        }

        // --- Follow-Up Intent Handling ("why", "why not", "what time", "where", "and tomorrow", etc.) ---
        $isWhyFollowUp = (bool)preg_match('/^(why|why\s+not|explain(\s+why)?|why\s+is\s+there\s+no\s+class|why\s+no\s+schedule)\??$/i', $lower);
        $isTimeFollowUp = (bool)preg_match('/^(what\s+time\??|when\??|at\s+what\s+time\??|which\s+time\??)$/i', $lower);
        $isWhereFollowUp = (bool)preg_match('/^(where\??|which\s+room\??|what\s+room\??|where\s+is\s+it\??)$/i', $lower);
        $isDayFollowUp = (bool)preg_match('/^(and\s+(tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)|what\s+about\s+(tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday))\??$/i', $lower);

        if ($isWhyFollowUp && $contextCourse) {
            $liveSchedules = Schedule::where(function ($q) use ($contextCourse) {
                $q->where('course', 'like', "%{$contextCourse}%")
                  ->orWhere('title', 'like', "%{$contextCourse}%");
            })->orderBy('day')->orderBy('start_time')->get();

            $actions[] = [
                'tool' => 'get_schedule',
                'args' => ['course' => $contextCourse],
                'result' => $liveSchedules->toArray(),
            ];

            if ($liveSchedules->isNotEmpty()) {
                $actualDays = $liveSchedules->map(fn($s) => "{$s->day} from {$s->start_time} to {$s->end_time} in Room {$s->room}")->implode(', ');
                $askedDayText = $contextDay ? " on {$contextDay}" : "";
                return [
                    'response' => "There is no class scheduled for **{$contextCourse}**{$askedDayText} because it is currently scheduled on **{$actualDays}**.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            } else {
                return [
                    'response' => "There is currently no active schedule found in the database for **{$contextCourse}**.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }
        }

        if ($isTimeFollowUp && $contextCourse) {
            $liveSchedules = Schedule::where(function ($q) use ($contextCourse) {
                $q->where('course', 'like', "%{$contextCourse}%")
                  ->orWhere('title', 'like', "%{$contextCourse}%");
            })->orderBy('day')->orderBy('start_time')->get();

            $actions[] = [
                'tool' => 'get_schedule',
                'args' => ['course' => $contextCourse],
                'result' => $liveSchedules->toArray(),
            ];

            if ($liveSchedules->isNotEmpty()) {
                $timeList = $liveSchedules->map(fn($s) => "• **{$s->day}**: {$s->start_time} - {$s->end_time} in **Room {$s->room}**")->implode("\n");
                return [
                    'response' => "Here are the class timings for **{$contextCourse}**:\n\n{$timeList}",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }
        }

        if ($isWhereFollowUp && $contextCourse) {
            $liveSchedules = Schedule::where(function ($q) use ($contextCourse) {
                $q->where('course', 'like', "%{$contextCourse}%")
                  ->orWhere('title', 'like', "%{$contextCourse}%");
            })->orderBy('day')->orderBy('start_time')->get();

            $actions[] = [
                'tool' => 'get_schedule',
                'args' => ['course' => $contextCourse],
                'result' => $liveSchedules->toArray(),
            ];

            if ($liveSchedules->isNotEmpty()) {
                $roomList = $liveSchedules->map(fn($s) => "• **Room {$s->room}** ({$s->day} {$s->start_time} - {$s->end_time})")->implode("\n");
                return [
                    'response' => "**{$contextCourse}** is held in:\n\n{$roomList}",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }
        }

        // --- ASSIGNMENT CREATION / FOLLOW-UP INTENT ---
        $isAssignmentIntent = (bool)preg_match('/\b(create|add|new|post|assign)\b.*\b(assignment|homework|coursework|lab\s*report|project|task)\b/i', $lower) ||
                              (bool)preg_match('/\b(assignment\s*(?:for|in)?\s*[a-z0-9\s]+)\b/i', $lower);
        
        $isAssignmentDetailsReply = false;
        if (!$isAssignmentIntent && count($history) > 0) {
            $lastAssistantMsg = '';
            for ($i = count($history) - 1; $i >= 0; $i--) {
                if (($history[$i]['role'] ?? '') === 'assistant' || ($history[$i]['role'] ?? '') === 'model') {
                    $lastAssistantMsg = (string)($history[$i]['content'] ?? '');
                    break;
                }
            }
            if (stripos($lastAssistantMsg, 'assignment title and deadline') !== false || stripos($lastAssistantMsg, 'title and deadline be') !== false) {
                $isAssignmentDetailsReply = true;
            }
        }
        if (!$isAssignmentIntent && preg_match('/^(assignment\s*\d+|homework\s*\d+|lab\s*\d+|project\s*\d+|[^,]+),\s*(?:deadline|due)\s*(.+)/i', $lower)) {
            $isAssignmentDetailsReply = true;
        }

        if ($isAssignmentIntent || $isAssignmentDetailsReply) {
            if (!in_array($role, ['admin', 'teacher'])) {
                return [
                    'response' => "HTTP 403 Forbidden: Action 'create_assignment' is restricted to faculty members (teachers) and administrators. Students can view assignments but cannot create or modify them.",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }

            $targetCourse = null;
            foreach ($allCoursesInDb as $c) {
                if (stripos($message, $c) !== false) {
                    $targetCourse = $c;
                    break;
                }
            }
            if (!$targetCourse && preg_match('/\b(test|cse\s*\d{3,4}|ipe\s*\d{3,4})\b/i', $message, $cm)) {
                $targetCourse = strtoupper(trim($cm[1]));
            }
            if (!$targetCourse && $contextCourse) {
                $targetCourse = $contextCourse;
            }

            if (!$targetCourse) {
                return [
                    'response' => "Which course would you like to create an assignment for? (e.g. CSE 321, CSE 331)",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }

            $title = null;
            $deadline = null;

            if (preg_match('/(?:title\s*[:=]\s*|called\s+[\'"]?|titled\s+[\'"]?)([^,\n\'"]+)/i', $message, $tm)) {
                $title = trim($tm[1]);
            } elseif (preg_match('/\b(assignment\s*\d+|homework\s*\d+|lab\s*(?:report\s*)?\d+|project\s*\d+)\b/i', $message, $tm)) {
                $title = ucfirst(trim($tm[1]));
            } elseif ($isAssignmentDetailsReply && preg_match('/^([^,]+),\s*(?:deadline|due)/i', $message, $tm)) {
                $title = trim($tm[1]);
            }

            if (preg_match('/(?:deadline|due(?:\s*date)?)\s*[:=]?\s*([A-Za-z0-9\s,-]+?)(?:\.|$|\s+for|\s+with)/i', $message, $dm)) {
                $deadline = trim($dm[1]);
            } elseif (preg_match('/\b(by|before|on)\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?|\d{4}-\d{2}-\d{2}|tomorrow)\b/i', $message, $dm)) {
                $deadline = trim($dm[2]);
            }

            if (!$title || !$deadline) {
                return [
                    'response' => "What should the assignment title and deadline be for **{$targetCourse}**? (e.g. *\"Assignment 1, deadline September 15\"*)",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }

            $execRes = $this->executeTool('create_assignment', [
                'course' => $targetCourse,
                'title' => $title,
                'deadline' => $deadline,
            ], $role, $user);

            $actions[] = [
                'tool' => 'create_assignment',
                'args' => ['course' => $targetCourse, 'title' => $title, 'deadline' => $deadline],
                'result' => $execRes,
            ];

            if ($execRes['success']) {
                $asgn = $execRes['assignment'];
                return [
                    'response' => " Successfully created assignment **\"{$asgn['title']}\"** for **{$asgn['course']}** with deadline **{$asgn['deadline']}**.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            } else {
                return [
                    'response' => $execRes['message'] ?? "Could not create assignment for {$targetCourse}.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }
        }

        // --- ANNOUNCEMENT CREATION INTENT ---
        $isAnnouncementIntent = (bool)preg_match('/\b(create|add|new|post|broadcast|publish)\b.*\b(announcement|notice|circular|bulletin)\b/i', $lower);
        if ($isAnnouncementIntent) {
            if (!in_array($role, ['admin', 'teacher'])) {
                return [
                    'response' => "HTTP 403 Forbidden: Action 'create_announcement' is restricted to faculty members (teachers) and administrators. Students cannot publish departmental announcements.",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }

            $targetCourse = null;
            foreach ($allCoursesInDb as $c) {
                if (stripos($message, $c) !== false) {
                    $targetCourse = $c;
                    break;
                }
            }
            if (!$targetCourse && preg_match('/\b(test|cse\s*\d{3,4}|ipe\s*\d{3,4})\b/i', $message, $cm)) {
                $targetCourse = strtoupper(trim($cm[1]));
            }

            $title = "Notice";
            $body = $message;

            if (preg_match('/(?:titled?|title\s*[:=])\s*[\'"]?([^\'",\n]+)[\'"]?/i', $message, $tm)) {
                $title = trim($tm[1]);
            } elseif ($targetCourse) {
                $title = "Announcement for {$targetCourse}";
            }

            if (preg_match('/(?:saying|that|content\s*[:=]|body\s*[:=])\s+(.+)$/i', $message, $bm)) {
                $body = trim($bm[1]);
            }

            $execRes = $this->executeTool('create_announcement', [
                'title' => $title,
                'body' => $body,
                'course' => $targetCourse,
                'priority' => str_contains($lower, 'urgent') || str_contains($lower, 'important') ? 'high' : 'medium',
            ], $role, $user);

            $actions[] = [
                'tool' => 'create_announcement',
                'args' => ['title' => $title, 'body' => $body, 'course' => $targetCourse],
                'result' => $execRes,
            ];

            if ($execRes['success']) {
                $ann = $execRes['announcement'];
                return [
                    'response' => " Successfully published announcement: **\"{$ann['title']}\"**\n\n*\"{$ann['body']}\"*",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            } else {
                return [
                    'response' => $execRes['message'] ?? "Could not create announcement.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }
        }

        // --- EVENT CREATION INTENT ---
        $isEventCreateIntent = (bool)preg_match('/\b(create|add|new|organize|schedule|host)\b.*\b(event|workshop|hackathon|seminar|webinar|meetup)\b/i', $lower);
        if ($isEventCreateIntent) {
            if (!in_array($role, ['admin', 'teacher'])) {
                return [
                    'response' => "HTTP 403 Forbidden: Action 'create_event' is restricted to faculty members (teachers) and administrators. Students can register for events but cannot create them.",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }

            $name = "Campus Event";
            if (preg_match('/(?:called|named|event|workshop|hackathon)\s+[\'"]?([^\'",\n]+)[\'"]?(?:\s+tomorrow|\s+on|\s+at|\s+with|$)/i', $message, $nm)) {
                $name = trim($nm[1]);
            }

            $date = self::getReferenceNow()->copy()->addDay()->format('Y-m-d');
            if (preg_match('/\btomorrow\b/i', $lower)) {
                $date = self::getReferenceNow()->copy()->addDay()->format('Y-m-d');
            } elseif (preg_match('/\b(\d{4}-\d{2}-\d{2})\b/', $message, $dm)) {
                $date = $dm[1];
            }

            $time = '14:00';
            if (preg_match('/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i', $message, $tm)) {
                $time = $this->parseTime($tm[1], $tm[2] ?? '00', $tm[3] ?? '');
            }

            $capacity = 50;
            if (preg_match('/(?:capacity(?:\s*of)?|\bseats?\b)\s*[:=]?\s*(\d+)/i', $message, $cm) || preg_match('/\b(\d+)\s*(?:seats|capacity|people|students|attendees)\b/i', $message, $cm)) {
                $capacity = (int)$cm[1];
            }

            $execRes = $this->executeTool('create_event', [
                'name' => $name,
                'date' => $date,
                'start_time' => $time,
                'capacity' => $capacity,
            ], $role, $user);

            $actions[] = [
                'tool' => 'create_event',
                'args' => ['name' => $name, 'date' => $date, 'start_time' => $time, 'capacity' => $capacity],
                'result' => $execRes,
            ];

            if ($execRes['success']) {
                $evt = $execRes['event'];
                return [
                    'response' => " Successfully created event **\"{$evt['name']}\"** scheduled for **{$evt['date']}** at **{$evt['start_time']}** in **{$evt['venue']}** (Capacity: {$evt['capacity']}).",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            } else {
                return [
                    'response' => $execRes['message'] ?? "Could not create event.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }
        }

        // --- COURSES & ENROLLMENT INTENTS ---
        $isMyCourses = (bool)preg_match('/\b(my\s+courses|courses\s+i\s+(?:take|teach|am\s+enrolled\s+in)|what\s+courses\s+do\s+i)\b/i', $lower);
        $isCourseCatalog = (bool)preg_match('/\b(all\s+courses|course\s+catalog|available\s+courses|list\s+courses|show\s+courses|get\s+courses|browse\s+courses)\b/i', $lower);
        $isEnrollIntent = (bool)preg_match('/\b(enroll|register)\b.*\b(course|cse\s*\d{3,4}|ipe\s*\d{3,4})\b/i', $lower) || (bool)preg_match('/^enroll\s+in\s+/i', $lower);
        $isDropIntent = (bool)preg_match('/\b(drop|leave|unenroll)\b.*\b(course|cse\s*\d{3,4}|ipe\s*\d{3,4})\b/i', $lower) || (bool)preg_match('/^drop\s+/i', $lower);

        if ($isEnrollIntent) {
            $targetCourse = null;
            foreach ($allCoursesInDb as $c) {
                if (stripos($message, $c) !== false) {
                    $targetCourse = $c;
                    break;
                }
            }
            if (!$targetCourse && preg_match('/\b(cse\s*\d{3,4}|ipe\s*\d{3,4})\b/i', $message, $cm)) {
                $targetCourse = strtoupper(trim($cm[1]));
            }

            if (!$targetCourse) {
                return [
                    'response' => "Which course would you like to enroll in? (e.g. *\"Enroll in CSE 321\"*)",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }

            $execRes = $this->executeTool('enroll_course', ['course' => $targetCourse], $role, $user);
            $actions[] = [
                'tool' => 'enroll_course',
                'args' => ['course' => $targetCourse],
                'result' => $execRes,
            ];

            return [
                'response' => $execRes['message'] ?? ($execRes['success'] ? "Successfully enrolled in {$targetCourse}." : "Could not enroll in {$targetCourse}."),
                'actions' => $actions,
                'source' => 'live_agent',
            ];
        }

        if ($isDropIntent) {
            $targetCourse = null;
            foreach ($allCoursesInDb as $c) {
                if (stripos($message, $c) !== false) {
                    $targetCourse = $c;
                    break;
                }
            }
            if (!$targetCourse && preg_match('/\b(cse\s*\d{3,4}|ipe\s*\d{3,4})\b/i', $message, $cm)) {
                $targetCourse = strtoupper(trim($cm[1]));
            }

            if (!$targetCourse) {
                return [
                    'response' => "Which course would you like to drop? (e.g. *\"Drop CSE 321\"*)",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }

            $execRes = $this->executeTool('drop_course', ['course' => $targetCourse], $role, $user);
            $actions[] = [
                'tool' => 'drop_course',
                'args' => ['course' => $targetCourse],
                'result' => $execRes,
            ];

            return [
                'response' => $execRes['message'] ?? ($execRes['success'] ? "Successfully dropped {$targetCourse}." : "Could not drop {$targetCourse}."),
                'actions' => $actions,
                'source' => 'live_agent',
            ];
        }

        if ($isMyCourses || $isCourseCatalog) {
            $execRes = $this->executeTool('get_courses', ['my_courses_only' => $isMyCourses], $role, $user);
            $actions[] = [
                'tool' => 'get_courses',
                'args' => ['my_courses_only' => $isMyCourses],
                'result' => $execRes,
            ];

            if ($execRes['success'] && !empty($execRes['data'])) {
                $lines = [];
                $label = $isMyCourses ? "Your Active Courses" : "University Course Catalog";
                foreach ($execRes['data'] as $c) {
                    $teacherName = $c['teacher']['name'] ?? 'Faculty TBA';
                    $enrolled = $c['enrolled_count'] ?? 0;
                    $cap = $c['capacity'] ?? 40;
                    $lines[] = "• **{$c['course_code']} - {$c['course_name']}** ({$c['credits']} Cr) | Teacher: {$teacherName} | Enrolled: {$enrolled}/{$cap}";
                }
                $coursesList = implode("\n", $lines);
                return [
                    'response' => "**{$label}** ({$execRes['count']} courses):\n\n{$coursesList}",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            } else {
                return [
                    'response' => $isMyCourses ? "You are not currently associated with any active courses." : "No courses found matching your query.",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }
        }

        // --- RESCHEDULE / MOVE INTENT HANDLING ---
        $isRescheduleIntent = (bool)preg_match('/\b(reschedule|move|shift|change)\b/i', $lower);
        if ($isRescheduleIntent && (str_contains($lower, 'class') || str_contains($lower, 'course') || str_contains($lower, 'schedule') || preg_match('/\b(to|on)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i', $lower))) {
            // 1. RBAC check: Student role cannot reschedule
            if ($role !== 'admin') {
                return [
                    'response' => "Schedule changes and rescheduling are restricted to administrators. As a student, I can check the current schedule for you, but I cannot modify class timings or days.",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }

            // 2. Extract Course
            $targetCourse = null;
            foreach ($allCoursesInDb as $c) {
                if (stripos($message, $c) !== false) {
                    $targetCourse = $c;
                    break;
                }
            }
            if (!$targetCourse && preg_match('/\b(test|cse\s*\d{4}|ipe\s*\d{4})\b/i', $message, $cm)) {
                $targetCourse = trim($cm[1]);
            }
            if (!$targetCourse && $contextCourse) {
                $targetCourse = $contextCourse;
            }

            // 3. Extract Target Day
            $targetDay = null;
            foreach ($weekdays as $d) {
                if (preg_match('/\b' . $d . '\b/i', $lower)) {
                    $targetDay = ucfirst($d);
                    break;
                }
            }

            if (!$targetCourse) {
                return [
                    'response' => "Which class or course would you like to reschedule?",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }

            if (!$targetDay) {
                return [
                    'response' => "Which day would you like to reschedule **{$targetCourse}** to? (e.g. Sunday, Monday, Tuesday)",
                    'actions' => [],
                    'source' => 'live_agent',
                ];
            }

            // Extract optional time
            $startTime = null;
            $endTime = null;
            if (preg_match('/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|-)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i', $message, $rangeMatch)) {
                $startTime = $this->parseTime($rangeMatch[1], $rangeMatch[2] ?? '00', $rangeMatch[3] ?? '');
                $endTime = $this->parseTime($rangeMatch[4], $rangeMatch[5] ?? '00', $rangeMatch[6] ?? '');
            }

            // Extract optional room
            $newRoom = null;
            if (preg_match('/\b(7[A-C]\d{2})\b/i', $message, $rm)) {
                $newRoom = strtoupper($rm[1]);
            }

            $updateRes = $this->executeTool('update_schedule', array_filter([
                'course' => $targetCourse,
                'day' => $targetDay,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'room' => $newRoom,
            ]), $role);

            $actions[] = [
                'tool' => 'update_schedule',
                'args' => array_filter(['course' => $targetCourse, 'day' => $targetDay, 'start_time' => $startTime, 'end_time' => $endTime, 'room' => $newRoom]),
                'result' => $updateRes,
            ];

            if ($updateRes['success']) {
                $sch = $updateRes['schedule'];
                $prev = $updateRes['previous'];
                return [
                    'response' => " Successfully rescheduled **{$sch['course']} ({$sch['title']})** to **{$sch['day']}** from **{$sch['start_time']} to {$sch['end_time']}** in **Room {$sch['room']}** (Previously: {$prev['day']} at {$prev['start_time']} - {$prev['end_time']}).",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            } else {
                return [
                    'response' => " Could not reschedule **{$targetCourse}**: {$updateRes['message']}",
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }
        }

        // 0. Ambiguous / Context-Free queries (e.g. "which times are available", "which day are available", "what times are free")
        $isAmbiguousAvailability = (
            preg_match('/^(which|what)\s+(times?|days?|hours?|slots?)\s+(are|is)\s+(available|free|open)\??$/i', $lower) ||
            preg_match('/^(which|what)\s+(are|is)\s+the\s+available\s+(times?|days?|slots?)\??$/i', $lower) ||
            preg_match('/^is\s+any(thing|one|room|slot)\s+available\??$/i', $lower)
        );

        // Check if query is missing both a specific room and a course code
        $hasRoomMention = (bool)preg_match('/\b(7[a-c]\d{2}|room\s*[0-9a-z]+|lab|seminar|classroom)\b/i', $message);
        $hasCourseMention = (bool)preg_match('/\b(test|cse\s*\d{4}|ipe\s*\d{4})\b/i', $message) || (bool)$contextCourse;

        if ($isAmbiguousAvailability && !$hasRoomMention && !$hasCourseMention) {
            return [
                'response' => "Could you please clarify which room or course schedule you are inquiring about?\n\nFor example:\n• *\"Which times is Room 7A01 available on Sunday?\"*\n• *\"Which days is Room 7B01 free?\"*\n• *\"What is the schedule for Test / CSE 4113?\"*\n• *\"Which rooms are available?\"*",
                'actions' => [],
                'source' => 'live_agent',
            ];
        }

        // 1. Specific Room Availability & Slots Queries
        if (preg_match('/\b(7[A-C]\d{2})\b/i', $message, $roomNumMatch) || preg_match('/room\s+([0-9A-Za-z]+)/i', $message, $roomNumMatch)) {
            $targetRoom = strtoupper($roomNumMatch[1]);
            $weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            $targetDay = null;
            foreach ($weekdays as $d) {
                if (preg_match('/\b' . $d . '\b/i', $lower)) {
                    $targetDay = ucfirst($d);
                    break;
                }
            }

            // A. Check specific time availability (e.g. "is room 7A01 available on Sunday at 10:00")
            $msgWithoutRoom = preg_replace('/\b(7[A-C]\d{2}|room\s*[0-9a-z]+)\b/i', '', $message);
            $hasTimeSpec = false;
            $startTime = '08:00';
            $endTime = '18:00';

            if (preg_match('/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|-)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i', $msgWithoutRoom, $rangeMatch)) {
                $hasTimeSpec = true;
                $startTime = $this->parseTime($rangeMatch[1], $rangeMatch[2] ?? '00', $rangeMatch[3] ?? '');
                $endTime = $this->parseTime($rangeMatch[4], $rangeMatch[5] ?? '00', $rangeMatch[6] ?? '');
            } elseif (preg_match('/(?:\bat\b|\bfrom\b|\bbetween\b)?\s*(\d{1,2})(?::(\d{2}))\s*(am|pm)?/i', $msgWithoutRoom, $timeMatch) ||
                      preg_match('/(?:\bat\b|\bfrom\b|\bbetween\b)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i', $msgWithoutRoom, $timeMatch) ||
                      preg_match('/(\d{1,2})\s*(am|pm)/i', $msgWithoutRoom, $timeMatch)) {
                $hasTimeSpec = true;
                $startH = $timeMatch[1];
                $startM = $timeMatch[2] ?? '00';
                $startAmpm = $timeMatch[3] ?? '';
                $startTime = $this->parseTime($startH, $startM, $startAmpm);
                $endH = ((int)$startH % 12) + 1;
                $endTime = $this->parseTime((string)$endH, $startM, $startAmpm);
            }

            if ($hasTimeSpec && (str_contains($lower, 'available') || str_contains($lower, 'free') || str_contains($lower, 'is room') || str_contains($lower, 'open'))) {
                $availRes = $this->executeTool('get_room_availability', [
                    'room' => $targetRoom,
                    'day' => $targetDay,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                ], $role);

                $actions[] = [
                    'tool' => 'get_room_availability',
                    'args' => array_filter(['room' => $targetRoom, 'day' => $targetDay, 'start_time' => $startTime, 'end_time' => $endTime]),
                    'result' => $availRes,
                ];

                if (!$availRes['success']) {
                    return [
                        'response' => "Room {$targetRoom} was not found in the database.",
                        'actions' => $actions,
                        'source' => 'live_agent',
                    ];
                }

                $dayLabel = $targetDay ? "on {$targetDay}" : "on {$availRes['date']}";
                if ($availRes['available']) {
                    return [
                        'response' => " **Room {$targetRoom}** is **available** {$dayLabel} from **{$startTime} to {$endTime}**.",
                        'actions' => $actions,
                        'source' => 'live_agent',
                    ];
                } else {
                    $conflictDescs = [];
                    foreach ($availRes['conflicts'] as $c) {
                        if (($c['type'] ?? '') === 'class') {
                            $conflictDescs[] = "Class: **{$c['course']} - {$c['title']}** ({$c['start_time']} - {$c['end_time']}, Sec: {$c['section']})";
                        } else {
                            $conflictDescs[] = "Booking: **" . ($c['purpose'] ?? 'Reserved') . "** ({$c['start_time']} - {$c['end_time']})";
                        }
                    }
                    $conflictStr = implode("\n• ", $conflictDescs);
                    return [
                        'response' => "❌ **Room {$targetRoom}** is **not available** {$dayLabel} from {$startTime} to {$endTime}.\n\n**Conflicts:**\n• {$conflictStr}",
                        'actions' => $actions,
                        'source' => 'live_agent',
                    ];
                }
            }

            // B. Room Available Slots (e.g. "which times is room 7A01 available on Sunday")
            if ((str_contains($lower, 'time') || str_contains($lower, 'slot') || str_contains($lower, 'when')) && (str_contains($lower, 'available') || str_contains($lower, 'free') || str_contains($lower, 'open'))) {
                $slotsRes = $this->executeTool('get_room_available_slots', [
                    'room' => $targetRoom,
                    'day' => $targetDay,
                ], $role);

                $actions[] = [
                    'tool' => 'get_room_available_slots',
                    'args' => array_filter(['room' => $targetRoom, 'day' => $targetDay]),
                    'result' => $slotsRes,
                ];

                if (!$slotsRes['success']) {
                    return [
                        'response' => "Room {$targetRoom} was not found in the database.",
                        'actions' => $actions,
                        'source' => 'live_agent',
                    ];
                }

                $dayLabel = $slotsRes['day'];
                if (empty($slotsRes['available_slots'])) {
                    return [
                        'response' => "Room **{$targetRoom}** has no free slots on **{$dayLabel}** during university operating hours (08:00 - 18:00).",
                        'actions' => $actions,
                        'source' => 'live_agent',
                    ];
                }

                $slotList = array_map(fn($s) => "• **{$s['slot']}**", $slotsRes['available_slots']);
                return [
                    'response' => "Here are the available time slots for **Room {$targetRoom}** on **{$dayLabel}** (Operating Hours: 08:00 - 18:00):\n\n" . implode("\n", $slotList),
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }

            // C. Room Available Days (e.g. "which days is room 7A01 available")
            if (str_contains($lower, 'day') && (str_contains($lower, 'available') || str_contains($lower, 'free') || str_contains($lower, 'open'))) {
                $daysRes = $this->executeTool('get_room_available_days', [
                    'room' => $targetRoom,
                ], $role);

                $actions[] = [
                    'tool' => 'get_room_available_days',
                    'args' => ['room' => $targetRoom],
                    'result' => $daysRes,
                ];

                if (!$daysRes['success']) {
                    return [
                        'response' => "Room {$targetRoom} was not found in the database.",
                        'actions' => $actions,
                        'source' => 'live_agent',
                    ];
                }

                $dayLines = [];
                foreach ($daysRes['days'] as $d) {
                    if ($d['is_available']) {
                        $slotsStr = implode(', ', array_column($d['available_slots'], 'slot'));
                        $dayLines[] = "• **{$d['day']}**: Available (Free Slots: {$slotsStr})";
                    } else {
                        $dayLines[] = "• **{$d['day']}**: Fully Booked";
                    }
                }

                return [
                    'response' => "Here is the weekly availability overview for **Room {$targetRoom}**:\n\n" . implode("\n", $dayLines),
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }
        }

        // 2. Vague room booking check
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

        // 3. Room booking action (e.g. "Book Room 7A02 tomorrow from 3 PM to 5 PM" or "Book Room 301 for me")
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

            // Extract date (e.g., tomorrow or date matching)
            $refNow = self::getReferenceNow();
            $date = $refNow->copy()->addDay()->format('Y-m-d'); // default tomorrow
            if (str_contains($lower, 'today')) {
                $date = $refNow->format('Y-m-d');
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

        // 4. Register for event action (e.g. "Register me for the Guest Lecture on Deep Learning")
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

        // 5. Room search / filter by type, capacity, equipment (e.g. "which rooms are available", "which labs have projector")
        if (str_contains($lower, 'room') || str_contains($lower, 'lab') || str_contains($lower, 'seminar') || str_contains($lower, 'classroom')) {
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
            $weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            $targetDay = null;
            foreach ($weekdays as $d) {
                if (preg_match('/\b' . $d . '\b/i', $lower)) {
                    $targetDay = ucfirst($d);
                    break;
                }
            }

            // Check if a course code or name is mentioned (including 'Test', 'CSE 4113', 'IPE 4111', etc.)
            // First check all distinct courses in the live database
            $allCoursesInDb = Schedule::select('course')->distinct()->pluck('course')->toArray();
            $matchedCourse = null;
            foreach ($allCoursesInDb as $c) {
                if (stripos($message, $c) !== false) {
                    $matchedCourse = $c;
                    break;
                }
            }

            // Also check standard regex patterns if not matched by exact course name in DB
            if (!$matchedCourse && preg_match('/(cse\s*\d{4}|ipe\s*\d{4}|test)/i', $message, $courseMatch)) {
                $matchedCourse = trim($courseMatch[1]);
            }

            if ($matchedCourse) {
                $schQuery = Schedule::where(function ($q) use ($matchedCourse) {
                    $q->where('course', 'like', "%{$matchedCourse}%")
                      ->orWhere('title', 'like', "%{$matchedCourse}%");
                });

                if ($targetDay) {
                    $schQuery->where('day', $targetDay);
                }

                $sch = $schQuery->orderBy('day')->orderBy('start_time')->get();
                $actions[] = [
                    'tool' => 'get_schedule',
                    'args' => array_filter(['course' => $matchedCourse, 'day' => $targetDay]),
                    'result' => $sch->toArray()
                ];
                
                // Also check announcements for any recent reschedule/cancellation
                $announcements = Announcement::where('title', 'like', "%{$matchedCourse}%")
                    ->orWhere('body', 'like', "%{$matchedCourse}%")
                    ->orderByDesc('date')
                    ->get();

                $annNotice = "";
                if ($announcements->isNotEmpty()) {
                    $latestAnn = $announcements->first();
                    $annNotice = "\n\n **Latest Notice Regarding {$matchedCourse}:**\n> {$latestAnn->title}: {$latestAnn->body}";
                }

                if ($sch->isEmpty()) {
                    $dayMsg = $targetDay ? " on {$targetDay}" : "";
                    return [
                        'response' => "No timetable schedule found for **{$matchedCourse}**{$dayMsg}." . $annNotice,
                        'actions' => $actions,
                        'source' => 'live_agent',
                    ];
                }

                $schList = $sch->map(function ($s) {
                    return "• **{$s->course}** ({$s->title}) — {$s->day} from {$s->start_time} to {$s->end_time} in **Room {$s->room}** (Instructor: {$s->instructor}, Sec: {$s->section})";
                })->implode("\n");

                return [
                    'response' => "Here is the schedule for **{$matchedCourse}**:\n\n" . $schList . $annNotice,
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            }

            if ($targetDay) {
                $daySchedules = Schedule::where('day', $targetDay)->orderBy('start_time')->get();
                $actions[] = ['tool' => 'get_schedule', 'args' => ['day' => $targetDay], 'result' => $daySchedules->toArray()];
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

            // Next class dynamically calculated using findNextClasses
            $nextResult = $this->findNextClasses();
            $actions[] = ['tool' => 'get_next_classes', 'args' => [], 'result' => $nextResult];
            
            if (!empty($nextResult['classes'])) {
                $targetDayName = $nextResult['target_day'];
                $list = collect($nextResult['classes'])->map(function ($s) {
                    return "• **{$s['start_time']} - {$s['end_time']}**: {$s['course']} ({$s['title']}) in **Room {$s['room']}** (Instructor: {$s['instructor']})";
                })->implode("\n");

                $first = $nextResult['classes'][0];
                return [
                    'response' => "Your next scheduled class is **{$first['course']} - {$first['title']}** on **{$targetDayName} at {$first['start_time']}** in **Room {$first['room']}** (Instructor: {$first['instructor']}).\n\nFull schedule for **{$targetDayName}**:\n" . $list,
                    'actions' => $actions,
                    'source' => 'live_agent',
                ];
            } else {
                return [
                    'response' => "You currently have no upcoming classes in the schedule database.",
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
    public function executeTool(string $toolName, array $args, string $role = 'student', ?User $user = null): array
    {
        // 1. Admin-Only Physical Tools (Physical rooms & reservations)
        $adminOnlyTools = [
            'book_room',
            'cancel_room_booking',
            'create_room',
            'update_room',
            'delete_room',
            'update_room_capacity'
        ];

        if (in_array($toolName, $adminOnlyTools) && $role !== 'admin') {
            return [
                'success' => false,
                'status_code' => 403,
                'message' => "HTTP 403 Forbidden: Action '{$toolName}' requires 'admin' role privileges. Physical room modifications and reservations are restricted to administrators. Current role is '{$role}'."
            ];
        }

        // 2. Faculty / Admin Mutation Tools (Assignments, Announcements, Events, Schedules)
        $facultyMutationTools = [
            'create_assignment',
            'update_assignment',
            'delete_assignment',
            'create_event',
            'delete_event',
            'create_announcement',
            'delete_announcement',
            'update_schedule'
        ];

        if (in_array($toolName, $facultyMutationTools) && !in_array($role, ['admin', 'teacher'])) {
            return [
                'success' => false,
                'status_code' => 403,
                'message' => "HTTP 403 Forbidden: Action '{$toolName}' is restricted to faculty members (teachers) and administrators. Students can view information but cannot create or modify academic records."
            ];
        }

        switch ($toolName) {
            // Tool 1: Class Schedules
            case 'update_schedule':
                $course = trim($args['course'] ?? '');
                $scheduleId = $args['schedule_id'] ?? null;
                $targetDay = !empty($args['day']) ? ucfirst(strtolower(trim($args['day']))) : null;
                $startTime = $args['start_time'] ?? null;
                $endTime = $args['end_time'] ?? null;
                $room = !empty($args['room']) ? strtoupper(trim($args['room'])) : null;
                $instructor = $args['instructor'] ?? null;
                $section = $args['section'] ?? null;

                $schedule = null;
                if ($scheduleId) {
                    $schedule = Schedule::find($scheduleId);
                }
                if (!$schedule && $course) {
                    $schedule = Schedule::where('course', 'like', "%{$course}%")
                        ->orWhere('title', 'like', "%{$course}%")
                        ->first();
                }

                if (!$schedule) {
                    return [
                        'success' => false,
                        'message' => "Schedule record for '{$course}' was not found in the database."
                    ];
                }

                $previousState = [
                    'day' => $schedule->day,
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'room' => $schedule->room,
                ];

                if ($targetDay) {
                    $schedule->day = $targetDay;
                }
                if ($startTime) {
                    $schedule->start_time = $startTime;
                }
                if ($endTime) {
                    $schedule->end_time = $endTime;
                }
                if ($room) {
                    $schedule->room = $room;
                }
                if ($instructor) {
                    $schedule->instructor = $instructor;
                }
                if ($section) {
                    $schedule->section = $section;
                }

                $schedule->save();

                return [
                    'success' => true,
                    'confirmed_by_db' => true,
                    'message' => "Successfully updated schedule for {$schedule->course} ({$schedule->title}).",
                    'schedule' => $schedule->toArray(),
                    'previous' => $previousState,
                ];

            case 'get_schedule':
            case 'get_schedules':
                $q = Schedule::query();
                if (!empty($args['day'])) {
                    $q->where('day', $args['day']);
                }
                if (!empty($args['course'])) {
                    $courseVal = trim($args['course']);
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

            // Tool 1b: Next Classes dynamically calculated from live database
            case 'get_next_classes':
                return $this->findNextClasses($args);

            // Tool 2: Room Availability & Inventory
            case 'get_room_availability':
                $refNow = self::getReferenceNow();
                $roomNum = strtoupper(trim($args['room'] ?? $args['room_number'] ?? ''));
                $date = $args['date'] ?? null;
                $day = !empty($args['day']) ? ucfirst(strtolower($args['day'])) : null;

                if (!$date && $day) {
                    $targetDayIdx = array_search($day, ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
                    $curIdx = (int)$refNow->dayOfWeek;
                    $diff = ($targetDayIdx - $curIdx + 7) % 7;
                    if ($diff === 0 && $refNow->format('H:i') > ($args['start_time'] ?? '08:00')) {
                        $diff = 7;
                    }
                    $date = $refNow->copy()->addDays($diff)->format('Y-m-d');
                } elseif (!$date) {
                    $date = $refNow->copy()->addDay()->format('Y-m-d');
                }

                $effectiveDay = $day ?: \Carbon\Carbon::parse($date)->format('l');
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

                $conflicts = [];

                // 1. Check class schedules
                $classSchedules = Schedule::where('room', $roomNum)->where('day', $effectiveDay)->get();
                foreach ($classSchedules as $cs) {
                    if ($startTime < $cs->end_time && $endTime > $cs->start_time) {
                        $conflicts[] = [
                            'type' => 'class',
                            'course' => $cs->course,
                            'title' => $cs->title,
                            'instructor' => $cs->instructor,
                            'section' => $cs->section,
                            'start_time' => $cs->start_time,
                            'end_time' => $cs->end_time,
                            'day' => $cs->day,
                        ];
                    }
                }

                // 2. Check bookings
                $bookings = $room->bookings ?? [];
                foreach ($bookings as $b) {
                    if (($b['date'] ?? '') === $date) {
                        $bStart = $b['start_time'] ?? '00:00';
                        $bEnd = $b['end_time'] ?? '23:59';
                        if ($startTime < $bEnd && $endTime > $bStart) {
                            $conflicts[] = array_merge($b, ['type' => 'booking']);
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
                    'day' => $effectiveDay,
                    'date' => $date,
                    'requested_slot' => "{$startTime} - {$endTime}",
                    'available' => $isAvailable,
                    'conflicts' => $conflicts,
                    'all_bookings_on_date' => array_values(array_filter($bookings, fn($b) => ($b['date'] ?? '') === $date)),
                ];

            // Tool 2b: Get Room Available Slots on a Specific Day/Date
            case 'get_room_available_slots':
                return $this->getRoomAvailableSlots(
                    strtoupper(trim($args['room'] ?? $args['room_number'] ?? '')),
                    $args['day'] ?? null,
                    $args['date'] ?? null
                );

            // Tool 2c: Get Room Available Days
            case 'get_room_available_days':
                return $this->getRoomAvailableDays(
                    strtoupper(trim($args['room'] ?? $args['room_number'] ?? ''))
                );

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
                $refNow = self::getReferenceNow();
                $q = Announcement::query();
                if (!empty($args['priority'])) {
                    $q->where('priority', $args['priority']);
                }
                if (!empty($args['active_only'])) {
                    $q->where('expires', '>=', $refNow->format('Y-m-d'));
                }
                $announcements = $q->orderByDesc('date')->get();
                return [
                    'success' => true,
                    'count' => $announcements->count(),
                    'data' => $announcements->toArray(),
                ];

            // Tool 5: Assignments & Deadlines
            case 'get_assignments':
                $refNow = self::getReferenceNow();
                $q = Assignment::query();
                if (!empty($args['course'])) {
                    $q->where('course', 'like', "%{$args['course']}%");
                }
                if (!empty($args['status'])) {
                    $q->where('status', $args['status']);
                }
                if (!empty($args['upcoming_only'])) {
                    $q->where('deadline', '>=', $refNow->format('Y-m-d'));
                }
                $assignments = $q->orderBy('deadline')->get();
                return [
                    'success' => true,
                    'count' => $assignments->count(),
                    'data' => $assignments->toArray(),
                ];

            // Tool 6: Mutation - Book Room (Admin Only)
            case 'book_room':
                $refNow = self::getReferenceNow();
                $roomNum = strtoupper(trim($args['room'] ?? $args['room_number'] ?? ''));
                $date = $args['date'] ?? $refNow->copy()->addDay()->format('Y-m-d');
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

            // Tool 8: Create Assignment (Teacher & Admin)
            case 'create_assignment':
                $courseCode = trim($args['course'] ?? $args['course_code'] ?? '');
                $title = trim($args['title'] ?? '');
                $deadlineRaw = trim($args['deadline'] ?? '');
                $description = trim($args['description'] ?? 'Course coursework assignment');
                $platform = trim($args['submission_platform'] ?? 'Google Classroom');
                $marks = isset($args['marks']) ? (int)$args['marks'] : 10;
                $assignedDate = $args['assigned_date'] ?? self::getReferenceNow()->format('Y-m-d');

                if (empty($courseCode) || empty($title) || empty($deadlineRaw)) {
                    return [
                        'success' => false,
                        'message' => "Missing required information: course code, assignment title, and deadline are required."
                    ];
                }

                // Verify Course Ownership if Teacher
                $courseObj = Course::where('course_code', $courseCode)
                    ->orWhere('id', $courseCode)
                    ->orWhere('course_code', 'like', "%{$courseCode}%")
                    ->first();

                if ($role === 'teacher' && $user && $courseObj && $courseObj->teacher_id && $courseObj->teacher_id != $user->id) {
                    return [
                        'success' => false,
                        'status_code' => 403,
                        'message' => "HTTP 403 Forbidden: You do not have permission to create an assignment for another teacher's course ({$courseObj->course_code})."
                    ];
                }

                $courseTitle = $args['course_title'] ?? ($courseObj ? $courseObj->course_name : "{$courseCode} Lecture");

                // Parse deadline safely
                try {
                    $parsedDeadline = \Carbon\Carbon::parse($deadlineRaw, 'Asia/Dhaka')->format('Y-m-d');
                } catch (\Throwable $e) {
                    $parsedDeadline = $deadlineRaw;
                }

                $newAsgn = Assignment::create([
                    'id' => 'asgn-' . Str::padLeft(Assignment::count() + 1, 3, '0'),
                    'course' => $courseObj ? $courseObj->course_code : $courseCode,
                    'course_title' => $courseTitle,
                    'title' => $title,
                    'description' => $description,
                    'assigned_date' => $assignedDate,
                    'deadline' => $parsedDeadline,
                    'submission_platform' => $platform,
                    'status' => 'pending',
                    'marks' => $marks,
                    'teacher_id' => $user?->id,
                ]);

                return [
                    'success' => true,
                    'confirmed_by_db' => true,
                    'message' => "Assignment '{$newAsgn->title}' has been created for {$newAsgn->course} with deadline {$newAsgn->deadline}.",
                    'assignment' => $newAsgn->toArray(),
                ];

            // Tool 9: Create Event (Teacher & Admin)
            case 'create_event':
                $name = trim($args['name'] ?? '');
                $dateRaw = $args['date'] ?? self::getReferenceNow()->copy()->addDay()->format('Y-m-d');
                $startTime = $args['start_time'] ?? '14:00';
                $endTime = $args['end_time'] ?? '16:00';
                $venue = $args['venue'] ?? '7C01';
                $capacity = isset($args['capacity']) ? (int)$args['capacity'] : 50;
                $description = $args['description'] ?? 'Official university event / workshop';
                $organizer = $args['organizer'] ?? ($user ? $user->name . ' (Faculty)' : 'CSE Department');

                if (empty($name)) {
                    return ['success' => false, 'message' => 'Event name is required.'];
                }

                try {
                    $parsedDate = \Carbon\Carbon::parse($dateRaw, 'Asia/Dhaka')->format('Y-m-d');
                } catch (\Throwable $e) {
                    $parsedDate = $dateRaw;
                }

                $newEvent = Event::create([
                    'id' => 'evt-' . Str::padLeft(Event::count() + 1, 3, '0'),
                    'name' => $name,
                    'description' => $description,
                    'date' => $parsedDate,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'end_date' => $parsedDate,
                    'venue' => $venue,
                    'organizer' => $organizer,
                    'capacity' => $capacity,
                    'registered' => 0,
                    'registrations' => [],
                    'status' => 'upcoming',
                ]);

                return [
                    'success' => true,
                    'confirmed_by_db' => true,
                    'message' => "Event '{$newEvent->name}' has been created on {$newEvent->date} ({$newEvent->start_time} - {$newEvent->end_time}) at {$newEvent->venue}.",
                    'event' => $newEvent->toArray(),
                ];

            // Tool 10: Create Announcement (Teacher & Admin)
            case 'create_announcement':
                $title = trim($args['title'] ?? '');
                $body = trim($args['body'] ?? '');
                $priority = $args['priority'] ?? 'medium';
                $postedBy = $args['posted_by'] ?? ($user ? $user->name . ' (Faculty)' : 'CSE Department');
                $courseCode = $args['course'] ?? null;
                $expires = $args['expires'] ?? self::getReferenceNow()->copy()->addDays(14)->format('Y-m-d');

                if (empty($title) || empty($body)) {
                    return ['success' => false, 'message' => 'Announcement title and body are required.'];
                }

                if ($courseCode && $role === 'teacher' && $user) {
                    $courseObj = Course::where('course_code', $courseCode)->first();
                    if ($courseObj && $courseObj->teacher_id && $courseObj->teacher_id != $user->id) {
                        return [
                            'success' => false,
                            'status_code' => 403,
                            'message' => "HTTP 403 Forbidden: You cannot create an announcement for another teacher's course."
                        ];
                    }
                }

                $newAnn = Announcement::create([
                    'id' => 'ann-' . Str::padLeft(Announcement::count() + 1, 3, '0'),
                    'title' => $title,
                    'body' => $body,
                    'date' => self::getReferenceNow()->format('Y-m-d'),
                    'priority' => $priority,
                    'posted_by' => $postedBy,
                    'expires' => $expires,
                ]);

                return [
                    'success' => true,
                    'confirmed_by_db' => true,
                    'message' => "Announcement '{$newAnn->title}' has been posted.",
                    'announcement' => $newAnn->toArray(),
                ];

            // Tool 11: Get Courses Catalog
            case 'get_courses':
                $cq = Course::with('teacher:id,name,email')->withCount(['enrollments as enrolled_count' => function ($q) {
                    $q->where('status', 'enrolled');
                }]);

                if (!empty($args['search'])) {
                    $s = trim($args['search']);
                    $cq->where(function ($q) use ($s) {
                        $q->where('course_code', 'like', "%{$s}%")
                          ->orWhere('course_name', 'like', "%{$s}%");
                    });
                }

                if (!empty($args['my_courses_only']) && $user) {
                    if ($role === 'teacher') {
                        $cq->where('teacher_id', $user->id);
                    } elseif ($role === 'student') {
                        $enrolledIds = CourseEnrollment::where('student_id', $user->id)->where('status', 'enrolled')->pluck('course_id');
                        $cq->whereIn('id', $enrolledIds);
                    }
                }

                $courses = $cq->orderBy('course_code')->get();
                return [
                    'success' => true,
                    'count' => $courses->count(),
                    'data' => $courses->toArray(),
                ];

            // Tool 12: Student Course Enrollment
            case 'enroll_course':
                $cCode = trim($args['course'] ?? '');
                $targetCourse = Course::where('course_code', $cCode)->orWhere('id', $cCode)->orWhere('course_code', 'like', "%{$cCode}%")->first();
                if (!$targetCourse) {
                    return ['success' => false, 'message' => "Course '{$cCode}' not found."];
                }

                if ($targetCourse->status !== 'active') {
                    return ['success' => false, 'message' => "Course '{$targetCourse->course_code}' is currently inactive and unavailable for enrollment."];
                }

                $studentId = $user ? $user->id : 1;
                $existing = CourseEnrollment::where('student_id', $studentId)->where('course_id', $targetCourse->id)->first();
                if ($existing && $existing->status === 'enrolled') {
                    return ['success' => false, 'message' => "Already enrolled in {$targetCourse->course_code}."];
                }

                $currentEnrolled = CourseEnrollment::where('course_id', $targetCourse->id)->where('status', 'enrolled')->count();
                if ($currentEnrolled >= $targetCourse->capacity) {
                    return ['success' => false, 'message' => "Course '{$targetCourse->course_code}' has reached its maximum enrollment capacity ({$targetCourse->capacity})."];
                }

                if ($existing) {
                    $existing->update(['status' => 'enrolled', 'enrolled_at' => now()]);
                } else {
                    CourseEnrollment::create([
                        'student_id' => $studentId,
                        'course_id' => $targetCourse->id,
                        'status' => 'enrolled',
                        'enrolled_at' => now(),
                    ]);
                }

                return [
                    'success' => true,
                    'confirmed_by_db' => true,
                    'message' => "Successfully enrolled in {$targetCourse->course_code} ({$targetCourse->course_name})!",
                    'course' => $targetCourse->toArray(),
                ];

            // Tool 13: Student Drop Course
            case 'drop_course':
                $cCode = trim($args['course'] ?? '');
                $targetCourse = Course::where('course_code', $cCode)->orWhere('id', $cCode)->orWhere('course_code', 'like', "%{$cCode}%")->first();
                if (!$targetCourse) {
                    return ['success' => false, 'message' => "Course '{$cCode}' not found."];
                }

                $studentId = $user ? $user->id : 1;
                $existing = CourseEnrollment::where('student_id', $studentId)->where('course_id', $targetCourse->id)->first();
                if (!$existing || $existing->status !== 'enrolled') {
                    return ['success' => false, 'message' => "You are not enrolled in {$targetCourse->course_code}."];
                }

                $existing->delete();
                return [
                    'success' => true,
                    'confirmed_by_db' => true,
                    'message' => "Successfully dropped course {$targetCourse->course_code}.",
                ];

            default:
                return [
                    'success' => false,
                    'message' => "Unknown tool: {$toolName}"
                ];
        }
    }

    /**
     * Determine next classes dynamically from live database based on current reference date/time
     */
    public function findNextClasses(array $args = []): array
    {
        $refNow = self::getReferenceNow();
        $currentTimeStr = $refNow->format('H:i'); // 24h format e.g. 18:24
        
        $weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // If a specific day is explicitly passed, query that day
        if (!empty($args['day'])) {
            $specifiedDay = ucfirst(strtolower($args['day']));
            $schedules = Schedule::where('day', $specifiedDay)->orderBy('start_time')->get();
            return [
                'success' => true,
                'current_reference_date' => $refNow->format('Y-m-d (l)'),
                'target_day' => $specifiedDay,
                'count' => $schedules->count(),
                'classes' => $schedules->toArray(),
            ];
        }

        $currentDayIndex = (int)$refNow->dayOfWeek; // 0 for Sunday, 5 for Friday, etc.
        
        // Search next days starting today
        for ($offset = 0; $offset < 7; $offset++) {
            $checkIndex = ($currentDayIndex + $offset) % 7;
            $checkDay = $weekdays[$checkIndex];
            
            $query = Schedule::where('day', $checkDay);
            if ($offset === 0) {
                // Today: only classes starting after current time
                $query->where('start_time', '>=', $currentTimeStr);
            }
            $classes = $query->orderBy('start_time')->get();
            
            if ($classes->isNotEmpty()) {
                return [
                    'success' => true,
                    'current_reference_date' => $refNow->format('Y-m-d (l)'),
                    'target_day' => $checkDay,
                    'is_today' => ($offset === 0),
                    'days_ahead' => $offset,
                    'count' => $classes->count(),
                    'classes' => $classes->toArray(),
                    'next_class' => $classes->first()->toArray(),
                ];
            }
        }

        return [
            'success' => true,
            'current_reference_date' => $refNow->format('Y-m-d (l)'),
            'count' => 0,
            'classes' => [],
            'message' => 'No upcoming classes found in the live schedule database.',
        ];
    }

    /**
     * Compute available time slots for a specific room on a given day/date between 08:00 and 18:00
     */
    public function getRoomAvailableSlots(string $roomNum, ?string $day = null, ?string $date = null): array
    {
        $refNow = self::getReferenceNow();
        $room = Room::where('room_number', $roomNum)->orWhere('id', $roomNum)->first();
        if (!$room) {
            return [
                'success' => false,
                'message' => "Room {$roomNum} does not exist in the database."
            ];
        }

        if (!$date && $day) {
            $dayName = ucfirst(strtolower($day));
            $targetDayIdx = array_search($dayName, ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
            $curIdx = (int)$refNow->dayOfWeek;
            $diff = ($targetDayIdx !== false) ? (($targetDayIdx - $curIdx + 7) % 7) : 0;
            $date = $refNow->copy()->addDays($diff)->format('Y-m-d');
        } elseif (!$day && $date) {
            $dayName = \Carbon\Carbon::parse($date)->format('l');
        } else {
            $dayName = $day ? ucfirst(strtolower($day)) : $refNow->copy()->addDay()->format('l');
            $date = $date ?: $refNow->copy()->addDay()->format('Y-m-d');
        }

        $occupied = $this->calculateRoomOccupiedIntervals($room->room_number, $dayName, $date);
        $freeSlots = $this->computeFreeSlotsFromOccupied($occupied, '08:00', '18:00');

        return [
            'success' => true,
            'room_number' => $room->room_number,
            'type' => $room->type,
            'capacity' => $room->capacity,
            'day' => $dayName,
            'date' => $date,
            'operating_hours' => '08:00 - 18:00',
            'occupied_intervals' => $occupied,
            'available_slots' => $freeSlots,
            'has_available_slots' => !empty($freeSlots),
        ];
    }

    /**
     * Compute available days across the standard academic week (Sunday to Thursday) for a room
     */
    public function getRoomAvailableDays(string $roomNum): array
    {
        $room = Room::where('room_number', $roomNum)->orWhere('id', $roomNum)->first();
        if (!$room) {
            return [
                'success' => false,
                'message' => "Room {$roomNum} does not exist in the database."
            ];
        }

        $weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
        $dayResults = [];

        foreach ($weekdays as $dayName) {
            $occupied = $this->calculateRoomOccupiedIntervals($room->room_number, $dayName, null);
            $freeSlots = $this->computeFreeSlotsFromOccupied($occupied, '08:00', '18:00');

            $dayResults[] = [
                'day' => $dayName,
                'is_available' => !empty($freeSlots),
                'available_slots' => $freeSlots,
                'occupied_count' => count($occupied),
            ];
        }

        $availableDays = array_values(array_filter($dayResults, fn($d) => $d['is_available']));

        return [
            'success' => true,
            'room_number' => $room->room_number,
            'type' => $room->type,
            'capacity' => $room->capacity,
            'days' => $dayResults,
            'available_days' => array_column($availableDays, 'day'),
        ];
    }

    /**
     * Collect all occupied intervals for a room from class schedules and bookings
     */
    public function calculateRoomOccupiedIntervals(string $roomNum, ?string $day = null, ?string $date = null): array
    {
        $occupied = [];

        // 1. Classes from schedules table
        $schQuery = Schedule::where('room', $roomNum);
        if ($day) {
            $schQuery->where('day', ucfirst(strtolower($day)));
        }
        foreach ($schQuery->get() as $s) {
            $occupied[] = [
                'day' => $s->day,
                'start_time' => $s->start_time,
                'end_time' => $s->end_time,
                'type' => 'class',
                'description' => "{$s->course} - {$s->title} (Sec: {$s->section})",
            ];
        }

        // 2. Bookings from Room model
        $room = Room::where('room_number', $roomNum)->orWhere('id', $roomNum)->first();
        if ($room && !empty($room->bookings)) {
            foreach ($room->bookings as $b) {
                $bDate = $b['date'] ?? '';
                $bDay = $bDate ? \Carbon\Carbon::parse($bDate)->format('l') : null;
                
                $match = false;
                if ($date && $bDate === $date) {
                    $match = true;
                } elseif ($day && $bDay && strtolower($bDay) === strtolower($day)) {
                    $match = true;
                } elseif (!$date && !$day) {
                    $match = true;
                }

                if ($match) {
                    $occupied[] = [
                        'day' => $bDay,
                        'date' => $bDate,
                        'start_time' => $b['start_time'] ?? '00:00',
                        'end_time' => $b['end_time'] ?? '23:59',
                        'type' => 'booking',
                        'description' => $b['purpose'] ?? 'Room Reservation',
                    ];
                }
            }
        }

        return $occupied;
    }

    /**
     * Compute free time slots between operating hours given occupied intervals
     */
    public function computeFreeSlotsFromOccupied(array $occupied, string $operatingStart = '08:00', string $operatingEnd = '18:00'): array
    {
        if (empty($occupied)) {
            return [
                [
                    'start_time' => $operatingStart,
                    'end_time' => $operatingEnd,
                    'slot' => "{$operatingStart} - {$operatingEnd}",
                ]
            ];
        }

        // Sort by start_time
        usort($occupied, fn($a, $b) => strcmp($a['start_time'], $b['start_time']));

        // Merge overlapping occupied intervals
        $merged = [];
        foreach ($occupied as $interval) {
            $s = max($operatingStart, min($operatingEnd, $interval['start_time']));
            $e = max($operatingStart, min($operatingEnd, $interval['end_time']));
            if ($s >= $e) continue;

            if (empty($merged)) {
                $merged[] = ['start_time' => $s, 'end_time' => $e];
            } else {
                $lastIndex = count($merged) - 1;
                if ($s <= $merged[$lastIndex]['end_time']) {
                    $merged[$lastIndex]['end_time'] = max($merged[$lastIndex]['end_time'], $e);
                } else {
                    $merged[] = ['start_time' => $s, 'end_time' => $e];
                }
            }
        }

        $freeSlots = [];
        $current = $operatingStart;

        foreach ($merged as $block) {
            if ($block['start_time'] > $current) {
                $freeSlots[] = [
                    'start_time' => $current,
                    'end_time' => $block['start_time'],
                    'slot' => "{$current} - {$block['start_time']}",
                ];
            }
            $current = max($current, $block['end_time']);
        }

        if ($current < $operatingEnd) {
            $freeSlots[] = [
                'start_time' => $current,
                'end_time' => $operatingEnd,
                'slot' => "{$current} - {$operatingEnd}",
            ];
        }

        return $freeSlots;
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
                        'description' => 'Retrieve class schedules from the live database. Can filter by course (e.g. Test, CSE 4113), day of week (e.g. Tuesday), instructor, or room. NEVER assume or invent a day unless requested.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'day' => [
                                    'type' => 'STRING',
                                    'description' => 'Optional day of the week: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday'
                                ],
                                'course' => [
                                    'type' => 'STRING',
                                    'description' => 'Course code or title to look up (e.g. Test, CSE 4113, Industrial Management)'
                                ],
                                'instructor' => [
                                    'type' => 'STRING',
                                    'description' => 'Instructor name'
                                ],
                                'room' => [
                                    'type' => 'STRING',
                                    'description' => 'Room number (e.g. 7A01, 7A03)'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'get_next_classes',
                        'description' => 'Dynamically find the upcoming class or next scheduled academic day classes from the live database according to current reference date/time.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'day' => [
                                    'type' => 'STRING',
                                    'description' => 'Optional specific day to check. Leave blank to automatically find the next upcoming class day.'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'get_room_availability',
                        'description' => 'Check exact live availability and conflict details for a specific university room on a given date/day and time range.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'required' => ['room'],
                            'properties' => [
                                'room' => [
                                    'type' => 'STRING',
                                    'description' => 'Room number (e.g. 7A03, 7B01, 7C02)'
                                ],
                                'day' => [
                                    'type' => 'STRING',
                                    'description' => 'Day of the week (e.g. Sunday, Monday, Tuesday)'
                                ],
                                'date' => [
                                    'type' => 'STRING',
                                    'description' => 'Date in YYYY-MM-DD format (e.g. 2026-09-06)'
                                ],
                                'start_time' => [
                                    'type' => 'STRING',
                                    'description' => 'Start time in 24h HH:MM format (e.g. 10:00, 14:00)'
                                ],
                                'end_time' => [
                                    'type' => 'STRING',
                                    'description' => 'End time in 24h HH:MM format (e.g. 11:00, 16:00)'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'get_room_available_slots',
                        'description' => 'Find unoccupied/free time slots for a specific university room on a given day or date between 08:00 and 18:00.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'required' => ['room'],
                            'properties' => [
                                'room' => [
                                    'type' => 'STRING',
                                    'description' => 'Room number (e.g. 7A01, 7B05)'
                                ],
                                'day' => [
                                    'type' => 'STRING',
                                    'description' => 'Day of the week (e.g. Sunday, Monday, Tuesday)'
                                ],
                                'date' => [
                                    'type' => 'STRING',
                                    'description' => 'Date in YYYY-MM-DD format'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'get_room_available_days',
                        'description' => 'Check which academic weekdays (Sunday through Thursday) have available slots for a specific room.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'required' => ['room'],
                            'properties' => [
                                'room' => [
                                    'type' => 'STRING',
                                    'description' => 'Room number (e.g. 7A01, 7A03)'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'search_rooms',
                        'description' => 'Search and filter campus rooms catalog by physical type (classroom, lab, seminar), minimum capacity, or required equipment (e.g. projector, AC, whiteboard). Do NOT use for general questions about what times/days are available.',
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
                        'name' => 'update_schedule',
                        'description' => 'MUTATION (Admin Only): Reschedule or update a class timetable entry in the live database. Requires Admin privileges.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'required' => ['course'],
                            'properties' => [
                                'course' => [
                                    'type' => 'STRING',
                                    'description' => 'Course code or name to reschedule (e.g. Test, CSE 4113)'
                                ],
                                'day' => [
                                    'type' => 'STRING',
                                    'description' => 'New target day of the week (e.g. Monday, Tuesday, Sunday)'
                                ],
                                'start_time' => [
                                    'type' => 'STRING',
                                    'description' => 'New start time in HH:MM format (optional, retains existing if omitted)'
                                ],
                                'end_time' => [
                                    'type' => 'STRING',
                                    'description' => 'New end time in HH:MM format (optional, retains existing if omitted)'
                                ],
                                'room' => [
                                    'type' => 'STRING',
                                    'description' => 'New room number (optional, retains existing if omitted)'
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
                    ],
                    [
                        'name' => 'create_assignment',
                        'description' => 'MUTATION (Faculty & Admin): Create a new coursework assignment for a course in the live database. Requires course code, title, and submission deadline.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'required' => ['course', 'title', 'deadline'],
                            'properties' => [
                                'course' => [
                                    'type' => 'STRING',
                                    'description' => 'Course code (e.g. CSE321, CSE 331, CSE 4113)'
                                ],
                                'title' => [
                                    'type' => 'STRING',
                                    'description' => 'Assignment title (e.g. Assignment 1, Project Milestone 1)'
                                ],
                                'deadline' => [
                                    'type' => 'STRING',
                                    'description' => 'Submission deadline date (e.g. 2026-09-15 or September 15)'
                                ],
                                'description' => [
                                    'type' => 'STRING',
                                    'description' => 'Detailed task description'
                                ],
                                'submission_platform' => [
                                    'type' => 'STRING',
                                    'description' => 'Platform (e.g. Google Classroom, Physical Submission)'
                                ],
                                'marks' => [
                                    'type' => 'INTEGER',
                                    'description' => 'Total assignment marks'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'create_event',
                        'description' => 'MUTATION (Faculty & Admin): Create a new university campus event, seminar, or workshop.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'required' => ['name', 'date', 'start_time', 'end_time'],
                            'properties' => [
                                'name' => [
                                    'type' => 'STRING',
                                    'description' => 'Event title / name'
                                ],
                                'date' => [
                                    'type' => 'STRING',
                                    'description' => 'Event date in YYYY-MM-DD format (or natural language date)'
                                ],
                                'start_time' => [
                                    'type' => 'STRING',
                                    'description' => 'Start time in 24h format HH:MM'
                                ],
                                'end_time' => [
                                    'type' => 'STRING',
                                    'description' => 'End time in 24h format HH:MM'
                                ],
                                'venue' => [
                                    'type' => 'STRING',
                                    'description' => 'Room number or venue (e.g. 7C01)'
                                ],
                                'capacity' => [
                                    'type' => 'INTEGER',
                                    'description' => 'Maximum allowed attendees'
                                ],
                                'description' => [
                                    'type' => 'STRING',
                                    'description' => 'Event overview and agenda'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'create_announcement',
                        'description' => 'MUTATION (Faculty & Admin): Publish an official department notice, circular, or course announcement.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'required' => ['title', 'body'],
                            'properties' => [
                                'title' => [
                                    'type' => 'STRING',
                                    'description' => 'Notice headline / title'
                                ],
                                'body' => [
                                    'type' => 'STRING',
                                    'description' => 'Full announcement text'
                                ],
                                'priority' => [
                                    'type' => 'STRING',
                                    'description' => 'Priority: high, medium, or low'
                                ],
                                'course' => [
                                    'type' => 'STRING',
                                    'description' => 'Optional course code if course-specific'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'get_courses',
                        'description' => 'Query the university course catalog, active courses, teacher information, and current enrollment capacity.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'search' => [
                                    'type' => 'STRING',
                                    'description' => 'Course code or name search query'
                                ],
                                'my_courses_only' => [
                                    'type' => 'BOOLEAN',
                                    'description' => 'Set true to view courses taught by current teacher or enrolled by student'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'enroll_course',
                        'description' => 'MUTATION (Student): Enroll authenticated student in an active university course.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'required' => ['course'],
                            'properties' => [
                                'course' => [
                                    'type' => 'STRING',
                                    'description' => 'Course code to enroll into (e.g. CSE321, CSE 331)'
                                ]
                            ]
                        ]
                    ],
                    [
                        'name' => 'drop_course',
                        'description' => 'MUTATION (Student): Drop an enrolled course.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'required' => ['course'],
                            'properties' => [
                                'course' => [
                                    'type' => 'STRING',
                                    'description' => 'Course code to drop (e.g. CSE321)'
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
