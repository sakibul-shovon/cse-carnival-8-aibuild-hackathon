<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    // GET all assignments
    public function index()
    {
        return response()->json(Assignment::all(), 200);
    }

    // POST create assignment
    public function store(Request $request)
    {
        $validated = $request->validate([
            'course' => 'required|string',
            'course_title' => 'required|string',
            'title' => 'required|string',
            'description' => 'sometimes|string',
            'deadline' => 'required|date',
            'submission_platform' => 'required|string',
            'status' => 'sometimes|string',
            'marks' => 'sometimes|integer',
        ]);

        $assignment = Assignment::create($validated);
        return response()->json($assignment, 201);
    }

    // GET single assignment
    public function show($id)
    {
        $assignment = Assignment::find($id);
        if (!$assignment) {
            return response()->json(['error' => 'Not found'], 404);
        }
        return response()->json($assignment, 200);
    }

    // PUT update assignment
    public function update(Request $request, $id)
    {
        $assignment = Assignment::find($id);
        if (!$assignment) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'course' => 'sometimes|string',
            'course_title' => 'sometimes|string',
            'title' => 'sometimes|string',
            'description' => 'sometimes|string',
            'deadline' => 'sometimes|date',
            'submission_platform' => 'sometimes|string',
            'status' => 'sometimes|string',
            'marks' => 'sometimes|integer',
        ]);

        $assignment->update($validated);
        return response()->json($assignment, 200);
    }

    // DELETE assignment
    public function destroy($id)
    {
        $assignment = Assignment::find($id);
        if (!$assignment) {
            return response()->json(['error' => 'Not found'], 404);
        }
        $assignment->delete();
        return response()->json(['message' => 'Deleted'], 200);
    }
}