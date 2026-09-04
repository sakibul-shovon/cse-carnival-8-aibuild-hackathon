<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AnnouncementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Announcement::query();

        if ($request->filled('priority')) {
            $query->where('priority', $request->query('priority'));
        }

        if ($request->filled('posted_by')) {
            $query->where('posted_by', 'like', '%' . $request->query('posted_by') . '%');
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%$search%")
                  ->orWhere('body', 'like', "%$search%")
                  ->orWhere('posted_by', 'like', "%$search%");
            });
        }

        return response()->json($query->orderByDesc('date')->get());
    }

    public function show(string $id): JsonResponse
    {
        $announcement = Announcement::find($id);
        if (!$announcement) {
            return response()->json(['message' => 'Announcement not found'], 404);
        }
        return response()->json($announcement);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden. Teacher or Admin access required.'], 403);
        }

        $validated = $request->validate([
            'id' => 'nullable|string',
            'title' => 'required|string',
            'body' => 'required|string',
            'date' => 'required|string',
            'priority' => 'required|string|in:high,medium,low',
            'posted_by' => 'nullable|string',
            'expires' => 'required|string',
        ]);

        if (empty($validated['id'])) {
            $validated['id'] = 'ann-' . Str::padLeft(Announcement::count() + 1, 3, '0');
        }
        if (empty($validated['posted_by'])) {
            $validated['posted_by'] = $user->name . ($user->role === 'teacher' ? ' (Faculty)' : ' (Admin)');
        }

        $announcement = Announcement::create($validated);
        return response()->json($announcement, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $announcement = Announcement::find($id);
        if (!$announcement) {
            return response()->json(['message' => 'Announcement not found'], 404);
        }

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // If teacher, can only edit announcements posted by themselves
        if ($user->role === 'teacher' && !str_contains(strtolower($announcement->posted_by), strtolower($user->name))) {
            return response()->json([
                'message' => 'Forbidden. You do not have permission to modify another faculty member\'s announcement.'
            ], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string',
            'body' => 'sometimes|required|string',
            'date' => 'sometimes|required|string',
            'priority' => 'sometimes|required|string|in:high,medium,low',
            'posted_by' => 'sometimes|required|string',
            'expires' => 'sometimes|required|string',
        ]);

        $announcement->update($validated);
        return response()->json($announcement);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $announcement = Announcement::find($id);
        if (!$announcement) {
            return response()->json(['message' => 'Announcement not found'], 404);
        }

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($user->role === 'teacher' && !str_contains(strtolower($announcement->posted_by), strtolower($user->name))) {
            return response()->json([
                'message' => 'Forbidden. You cannot delete another faculty member\'s announcement.'
            ], 403);
        }

        $announcement->delete();
        return response()->json(['message' => 'Announcement deleted successfully']);
    }
}
