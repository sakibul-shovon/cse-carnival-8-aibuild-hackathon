<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventRegistration;
use Illuminate\Http\Request;

class EventController extends Controller
{
    // GET all events
    public function index()
    {
        $events = Event::with('registrations')->get();
        return response()->json($events, 200);
    }

    // POST create event
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'description' => 'sometimes|string',
            'date' => 'required|date',
            'start_time' => 'required|string',
            'end_time' => 'required|string',
            'venue' => 'required|string',
            'capacity' => 'required|integer',
            'status' => 'sometimes|string',
        ]);

        $event = Event::create($validated);
        return response()->json($event, 201);
    }

    // GET single event
    public function show($id)
    {
        $event = Event::with('registrations')->find($id);
        if (!$event) {
            return response()->json(['error' => 'Not found'], 404);
        }
        return response()->json($event, 200);
    }

    // PUT update event
    public function update(Request $request, $id)
    {
        $event = Event::find($id);
        if (!$event) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string',
            'description' => 'sometimes|string',
            'date' => 'sometimes|date',
            'start_time' => 'sometimes|string',
            'end_time' => 'sometimes|string',
            'venue' => 'sometimes|string',
            'capacity' => 'sometimes|integer',
            'status' => 'sometimes|string',
        ]);

        $event->update($validated);
        return response()->json($event->load('registrations'), 200);
    }

    // DELETE event
    public function destroy($id)
    {
        $event = Event::find($id);
        if (!$event) {
            return response()->json(['error' => 'Not found'], 404);
        }
        $event->delete();
        return response()->json(['message' => 'Deleted'], 200);
    }

    // POST register for event
    public function registerEvent(Request $request, $id)
    {
        $event = Event::find($id);
        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        $validated = $request->validate([
            'student_id' => 'required|string',
            'name' => 'required|string',
        ]);

        // Check capacity
        if ($event->registrations()->count() >= $event->capacity) {
            return response()->json(['error' => 'Event is full'], 409);
        }

        $registration = EventRegistration::create([
            'event_id' => $id,
            ...$validated,
        ]);

        return response()->json($registration, 201);
    }

    // DELETE cancel registration
    public function cancelRegistration($eventId, $registrationId)
    {
        $registration = EventRegistration::find($registrationId);
        if (!$registration || $registration->event_id != $eventId) {
            return response()->json(['error' => 'Registration not found'], 404);
        }
        $registration->delete();
        return response()->json(['message' => 'Registration cancelled'], 200);
    }
}