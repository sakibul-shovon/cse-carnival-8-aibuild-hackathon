<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\CourseEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AssignmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Assignment::query();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('course')) {
            $query->where('course', 'like', '%' . $request->query('course') . '%');
        }

        // For student, optionally filter by enrolled courses if requested
        if ($user && $user->role === 'student' && $request->boolean('enrolled_only')) {
            $enrolledCourses = CourseEnrollment::where('student_id', $user->id)
                ->where('status', 'enrolled')
                ->with('course:id,course_code')
                ->get()
                ->pluck('course.course_code')
                ->filter()
                ->toArray();

            $query->whereIn('course', $enrolledCourses);
        }

        // For teacher, optionally filter by my courses if requested
        if ($user && $user->role === 'teacher' && $request->boolean('my_courses_only')) {
            $teacherCourses = Course::where('teacher_id', $user->id)->pluck('course_code')->toArray();
            $query->where(function ($q) use ($user, $teacherCourses) {
                $q->where('teacher_id', $user->id)
                  ->orWhereIn('course', $teacherCourses);
            });
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
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden. Teacher or Admin access required.'], 403);
        }

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

        // If Teacher, verify teacher owns this course (if course exists in courses table)
        if ($user->role === 'teacher') {
            $course = Course::where('course_code', $validated['course'])
                ->orWhere('id', $validated['course'])
                ->first();

            if ($course && $course->teacher_id && $course->teacher_id != $user->id) {
                return response()->json([
                    'message' => "Forbidden. You cannot create an assignment for another teacher's course ({$course->course_code})."
                ], 403);
            }
            $validated['teacher_id'] = $user->id;
        }

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
        $user = $request->user();
        $assignment = Assignment::find($id);
        if (!$assignment) {
            return response()->json(['message' => 'Assignment not found'], 404);
        }

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Ownership check for Teacher
        if ($user->role === 'teacher') {
            $course = Course::where('course_code', $assignment->course)->first();
            $isOwner = ($assignment->teacher_id == $user->id) || ($course && $course->teacher_id == $user->id);
            if (!$isOwner && $assignment->teacher_id !== null) {
                return response()->json([
                    'message' => "Forbidden. You do not have permission to modify another teacher's assignment."
                ], 403);
            }
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

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $assignment = Assignment::find($id);
        if (!$assignment) {
            return response()->json(['message' => 'Assignment not found'], 404);
        }

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Ownership check for Teacher
        if ($user->role === 'teacher') {
            $course = Course::where('course_code', $assignment->course)->first();
            $isOwner = ($assignment->teacher_id == $user->id) || ($course && $course->teacher_id == $user->id);
            if (!$isOwner && $assignment->teacher_id !== null) {
                return response()->json([
                    'message' => "Forbidden. You cannot delete another teacher's assignment."
                ], 403);
            }
        }

        $assignment->delete();
        return response()->json(['message' => 'Assignment deleted successfully']);
    }
}
