<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AssignmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Assignment::query();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('course')) {
            $query->where('course', 'like', '%' . $request->query('course') . '%');
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('course', 'like', "%$search%")
                  ->orWhere('course_title', 'like', "%$search%")
                  ->orWhere('title', 'like', "%$search%")
                  ->orWhere('description', 'like', "%$search%");
            });
        }

        return response()->json($query->orderBy('deadline')->get());
    }

    public function show(string $id): JsonResponse
    {
        $assignment = Assignment::find($id);
        if (!$assignment) {
            return response()->json(['message' => 'Assignment not found'], 404);
        }
        return response()->json($assignment);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id' => 'nullable|string',
            'course' => 'required|string',
            'course_title' => 'required|string',
            'title' => 'required|string',
            'description' => 'required|string',
            'assigned_date' => 'required|string',
            'deadline' => 'required|string',
            'submission_platform' => 'required|string',
            'status' => 'nullable|string|in:pending,submitted,graded,late',
            'marks' => 'nullable|integer',
        ]);

        if (empty($validated['id'])) {
            $validated['id'] = 'asgn-' . Str::padLeft(Assignment::count() + 1, 3, '0');
        }
        if (!isset($validated['status'])) {
            $validated['status'] = 'pending';
        }
        if (!isset($validated['marks'])) {
            $validated['marks'] = 0;
        }

        $assignment = Assignment::create($validated);
        return response()->json($assignment, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $assignment = Assignment::find($id);
        if (!$assignment) {
            return response()->json(['message' => 'Assignment not found'], 404);
        }

        $validated = $request->validate([
            'course' => 'sometimes|required|string',
            'course_title' => 'sometimes|required|string',
            'title' => 'sometimes|required|string',
            'description' => 'sometimes|required|string',
            'assigned_date' => 'sometimes|required|string',
            'deadline' => 'sometimes|required|string',
            'submission_platform' => 'sometimes|required|string',
            'status' => 'sometimes|required|string|in:pending,submitted,graded,late',
            'marks' => 'sometimes|required|integer',
        ]);

        $assignment->update($validated);
        return response()->json($assignment);
    }

    public function destroy(string $id): JsonResponse
    {
        $assignment = Assignment::find($id);
        if (!$assignment) {
            return response()->json(['message' => 'Assignment not found'], 404);
        }
        $assignment->delete();
        return response()->json(['message' => 'Assignment deleted successfully']);
    }
}
