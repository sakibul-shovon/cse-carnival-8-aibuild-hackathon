<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    // GET all schedules
    public function index()
    {
        return response()->json(Schedule::all(), 200);
    }

    // POST create schedule
    public function store(Request $request)
    {
        $validated = $request->validate([
            'course' => 'required|string',
            'title' => 'required|string',
            'day' => 'required|string',
            'start_time' => 'required|string',
            'end_time' => 'required|string',
            'room' => 'required|string',
            'instructor' => 'required|string',
            'section' => 'required|string',
        ]);

        $schedule = Schedule::create($validated);
        return response()->json($schedule, 201);
    }

    // GET single schedule
    public function show($id)
    {
        $schedule = Schedule::find($id);
        if (!$schedule) {
            return response()->json(['error' => 'Not found'], 404);
        }
        return response()->json($schedule, 200);
    }

    // PUT update schedule
    public function update(Request $request, $id)
    {
        $schedule = Schedule::find($id);
        if (!$schedule) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'course' => 'sometimes|string',
            'title' => 'sometimes|string',
            'day' => 'sometimes|string',
            'start_time' => 'sometimes|string',
            'end_time' => 'sometimes|string',
            'room' => 'sometimes|string',
            'instructor' => 'sometimes|string',
            'section' => 'sometimes|string',
        ]);

        $schedule->update($validated);
        return response()->json($schedule, 200);
    }

    // DELETE schedule
    public function destroy($id)
    {
        $schedule = Schedule::find($id);
        if (!$schedule) {
            return response()->json(['error' => 'Not found'], 404);
        }
        $schedule->delete();
        return response()->json(['message' => 'Deleted'], 200);
    }
}