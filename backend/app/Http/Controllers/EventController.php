<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Event::query();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('date')) {
            $query->where('date', $request->query('date'));
        }

        if ($request->filled('venue')) {
            $query->where('venue', $request->query('venue'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('description', 'like', "%$search%")
                  ->orWhere('organizer', 'like', "%$search%")
                  ->orWhere('venue', 'like', "%$search%");
            });
        }

        return response()->json($query->orderBy('date')->orderBy('start_time')->get());
    }

    public function show(string $id): JsonResponse
    {
        $event = Event::find($id);
        if (!$event) {
            return response()->json(['message' => 'Event not found'], 404);
        }
        return response()->json($event);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden. Teacher or Admin access required.'], 403);
        }

        $validated = $request->validate([
            'id' => 'nullable|string',
            'name' => 'required|string',
            'description' => 'required|string',
            'date' => 'required|string',
            'start_time' => 'required|string',
            'end_time' => 'required|string',
            'end_date' => 'nullable|string',
            'venue' => 'required|string',
            'organizer' => 'nullable|string',
            'capacity' => 'required|integer|min:1',
            'registered' => 'nullable|integer',
            'registrations' => 'nullable|array',
            'status' => 'nullable|string|in:upcoming,ongoing,completed,cancelled,full',
        ]);

        if (empty($validated['id'])) {
            $validated['id'] = 'evt-' . Str::padLeft(Event::count() + 1, 3, '0');
        }
        if (empty($validated['organizer'])) {
            $validated['organizer'] = $user->name . ($user->role === 'teacher' ? ' (Faculty)' : ' (Admin)');
        }
        if (empty($validated['end_date'])) {
            $validated['end_date'] = $validated['date'];
        }
        if (!isset($validated['registered'])) {
            $validated['registered'] = count($validated['registrations'] ?? []);
        }
        if (!isset($validated['status'])) {
            $validated['status'] = 'upcoming';
        }

        $event = Event::create($validated);
        return response()->json($event, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $event = Event::find($id);
        if (!$event) {
            return response()->json(['message' => 'Event not found'], 404);
        }

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($user->role === 'teacher' && !str_contains(strtolower($event->organizer), strtolower($user->name))) {
            return response()->json([
                'message' => 'Forbidden. You do not have permission to modify another organizer\'s event.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string',
            'description' => 'sometimes|required|string',
            'date' => 'sometimes|required|string',
            'start_time' => 'sometimes|required|string',
            'end_time' => 'sometimes|required|string',
            'end_date' => 'nullable|string',
            'venue' => 'sometimes|required|string',
            'organizer' => 'sometimes|required|string',
            'capacity' => 'sometimes|required|integer|min:1',
            'registered' => 'nullable|integer',
            'registrations' => 'nullable|array',
            'status' => 'nullable|string|in:upcoming,ongoing,completed,cancelled,full',
        ]);

        $event->update($validated);
        return response()->json($event);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $event = Event::find($id);
        if (!$event) {
            return response()->json(['message' => 'Event not found'], 404);
        }

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($user->role === 'teacher' && !str_contains(strtolower($event->organizer), strtolower($user->name))) {
            return response()->json([
                'message' => 'Forbidden. You cannot delete another organizer\'s event.'
            ], 403);
        }

        $event->delete();
        return response()->json(['message' => 'Event deleted successfully']);
    }

    public function register(Request $request, string $id): JsonResponse
    {
        $event = Event::find($id);
        if (!$event) {
            return response()->json(['message' => 'Event not found'], 404);
        }

        $validated = $request->validate([
            'student_id' => 'required|string',
            'name' => 'required|string',
        ]);

        if ($event->status === 'full' || ($event->capacity > 0 && $event->registered >= $event->capacity)) {
            return response()->json(['message' => "Event '{$event->name}' is already full."], 422);
        }

        if ($event->status === 'cancelled') {
            return response()->json(['message' => "Event '{$event->name}' has been cancelled."], 422);
        }

        $registrations = $event->registrations ?? [];

        // Check if already registered
        foreach ($registrations as $r) {
            if (($r['student_id'] ?? '') === $validated['student_id']) {
                return response()->json(['message' => "Student {$validated['student_id']} is already registered for this event."], 422);
            }
        }

        $registrations[] = [
            'student_id' => $validated['student_id'],
            'name' => $validated['name'],
        ];

        $event->registrations = $registrations;
        $event->registered = count($registrations);
        if ($event->registered >= $event->capacity) {
            $event->status = 'full';
        }
        $event->save();

        return response()->json([
            'message' => "Successfully registered for {$event->name}",
            'event' => $event,
        ]);
    }

    public function cancelRegistration(Request $request, string $id): JsonResponse
    {
        $event = Event::find($id);
        if (!$event) {
            return response()->json(['message' => 'Event not found'], 404);
        }

        $validated = $request->validate([
            'student_id' => 'required|string',
        ]);

        $registrations = $event->registrations ?? [];
        $found = false;
        $updated = [];
        foreach ($registrations as $r) {
            if (($r['student_id'] ?? '') === $validated['student_id']) {
                $found = true;
            } else {
                $updated[] = $r;
            }
        }

        if (!$found) {
            return response()->json(['message' => 'Registration not found for this student ID'], 404);
        }

        $event->registrations = $updated;
        $event->registered = count($updated);
        if ($event->status === 'full' && $event->registered < $event->capacity) {
            $event->status = 'upcoming';
        }
        $event->save();

        return response()->json([
            'message' => "Registration cancelled successfully",
            'event' => $event,
        ]);
    }
}
