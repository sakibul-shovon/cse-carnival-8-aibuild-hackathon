<?php

namespace App\Http\Controllers;

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
        $schedule = Schedule::find($id);
        if (!$schedule) {
            return response()->json(['message' => 'Schedule not found'], 404);
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

        $schedule->update($validated);
        return response()->json($schedule);
    }

    public function destroy(string $id): JsonResponse
    {
        $schedule = Schedule::find($id);
        if (!$schedule) {
            return response()->json(['message' => 'Schedule not found'], 404);
        }
        $schedule->delete();
        return response()->json(['message' => 'Schedule deleted successfully']);
    }
}
