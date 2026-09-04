<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    // GET all announcements
    public function index()
    {
        return response()->json(Announcement::all(), 200);
    }

    // POST create announcement
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'body' => 'required|string',
            'date' => 'required|date',
            'priority' => 'required|in:low,medium,high',
            'posted_by' => 'required|string',
            'expires' => 'sometimes|date',
        ]);

        $announcement = Announcement::create($validated);
        return response()->json($announcement, 201);
    }

    // GET single announcement
    public function show($id)
    {
        $announcement = Announcement::find($id);
        if (!$announcement) {
            return response()->json(['error' => 'Not found'], 404);
        }
        return response()->json($announcement, 200);
    }

    // PUT update announcement
    public function update(Request $request, $id)
    {
        $announcement = Announcement::find($id);
        if (!$announcement) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string',
            'body' => 'sometimes|string',
            'date' => 'sometimes|date',
            'priority' => 'sometimes|in:low,medium,high',
            'posted_by' => 'sometimes|string',
            'expires' => 'sometimes|date',
        ]);

        $announcement->update($validated);
        return response()->json($announcement, 200);
    }

    // DELETE announcement
    public function destroy($id)
    {
        $announcement = Announcement::find($id);
        if (!$announcement) {
            return response()->json(['error' => 'Not found'], 404);
        }
        $announcement->delete();
        return response()->json(['message' => 'Deleted'], 200);
    }
}