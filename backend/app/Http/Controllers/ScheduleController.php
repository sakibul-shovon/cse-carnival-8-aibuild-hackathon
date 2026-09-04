<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Room;
use App\Models\Schedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Schedule::query();

        if ($request->filled('day')) {
            $query->where('day', $request->query('day'));
        }

        if ($request->filled('course')) {
            $query->where('course', 'like', '%' . $request->query('course') . '%');
        }

        if ($request->filled('room')) {
            $query->where('room', 'like', '%' . $request->query('room') . '%');
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('course', 'like', "%$search%")
                  ->orWhere('title', 'like', "%$search%")
                  ->orWhere('instructor', 'like', "%$search%")
                  ->orWhere('room', 'like', "%$search%");
            });
        }

        return response()->json($query->orderBy('day')->orderBy('start_time')->get());
    }

    public function show(string $id): JsonResponse
    {
        $schedule = Schedule::find($id);
        if (!$schedule) {
            return response()->json(['message' => 'Schedule not found'], 404);
        }
        return response()->json($schedule);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden. Teacher or Admin access required.'], 403);
        }

        $validated = $request->validate([
            'id' => 'nullable|string',
            'course' => 'required|string',
            'title' => 'required|string',
            'day' => 'required|string|in:Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
            'start_time' => 'required|string',
            'end_time' => 'required|string',
            'room' => 'required|string',
            'instructor' => 'nullable|string',
            'section' => 'nullable|string',
        ]);

        // Teacher Course Ownership Check
        if ($user->role === 'teacher') {
            $course = Course::where('course_code', $validated['course'])->first();
            if ($course && $course->teacher_id && $course->teacher_id != $user->id) {
                return response()->json([
                    'message' => "Forbidden. You cannot manage schedules for another teacher's course."
                ], 403);
            }
            if (empty($validated['instructor'])) {
                $validated['instructor'] = $user->name;
            }
        }

        // Conflict check: Check if Room is already occupied at that day and overlapping time
        $existingSchedule = Schedule::where('room', $validated['room'])
            ->where('day', $validated['day'])
            ->where(function ($q) use ($validated) {
                $q->where('start_time', '<', $validated['end_time'])
                  ->where('end_time', '>', $validated['start_time']);
            })
            ->first();

        if ($existingSchedule) {
            return response()->json([
                'message' => "Schedule Conflict: Room {$validated['room']} is already occupied on {$validated['day']} by {$existingSchedule->course} ({$existingSchedule->start_time} - {$existingSchedule->end_time})."
            ], 422);
        }

        if (empty($validated['id'])) {
            $validated['id'] = 'sch-' . Str::padLeft(Schedule::count() + 1, 3, '0');
        }
        if (empty($validated['instructor'])) {
            $validated['instructor'] = 'TBA';
        }

        $schedule = Schedule::create($validated);
        return response()->json($schedule, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $schedule = Schedule::find($id);
        if (!$schedule) {
            return response()->json(['message' => 'Schedule not found'], 404);
        }

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Teacher Course Ownership Check
        if ($user->role === 'teacher') {
            $course = Course::where('course_code', $schedule->course)->first();
            if ($course && $course->teacher_id && $course->teacher_id != $user->id) {
                return response()->json([
                    'message' => "Forbidden. You cannot modify another teacher's course schedule."
                ], 403);
            }
        }

        $validated = $request->validate([
            'course' => 'sometimes|required|string',
            'title' => 'sometimes|required|string',
            'day' => 'sometimes|required|string|in:Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
            'start_time' => 'sometimes|required|string',
            'end_time' => 'sometimes|required|string',
            'room' => 'sometimes|required|string',
            'instructor' => 'nullable|string',
            'section' => 'nullable|string',
        ]);

        $checkRoom = $validated['room'] ?? $schedule->room;
        $checkDay = $validated['day'] ?? $schedule->day;
        $checkStart = $validated['start_time'] ?? $schedule->start_time;
        $checkEnd = $validated['end_time'] ?? $schedule->end_time;

        // Conflict check excluding current schedule
        $existingSchedule = Schedule::where('id', '!=', $schedule->id)
            ->where('room', $checkRoom)
            ->where('day', $checkDay)
            ->where(function ($q) use ($checkStart, $checkEnd) {
                $q->where('start_time', '<', $checkEnd)
                  ->where('end_time', '>', $checkStart);
            })
            ->first();

        if ($existingSchedule) {
            return response()->json([
                'message' => "Schedule Conflict: Room {$checkRoom} is already occupied on {$checkDay} by {$existingSchedule->course} ({$existingSchedule->start_time} - {$existingSchedule->end_time})."
            ], 422);
        }

        $schedule->update($validated);
        return response()->json($schedule);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $schedule = Schedule::find($id);
        if (!$schedule) {
            return response()->json(['message' => 'Schedule not found'], 404);
        }

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($user->role === 'teacher') {
            $course = Course::where('course_code', $schedule->course)->first();
            if ($course && $course->teacher_id && $course->teacher_id != $user->id) {
                return response()->json([
                    'message' => "Forbidden. You cannot delete another teacher's course schedule."
                ], 403);
            }
        }

        $schedule->delete();
        return response()->json(['message' => 'Schedule deleted successfully']);
    }
}
