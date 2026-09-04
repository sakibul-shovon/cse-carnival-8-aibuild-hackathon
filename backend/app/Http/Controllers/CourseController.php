<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CourseController extends Controller
{
    /**
     * List all courses with teacher details and student enrollment status.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Course::with(['teacher:id,name,email'])->withCount(['enrollments as enrolled_count' => function ($q) {
            $q->where('status', 'enrolled');
        }]);

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('course_code', 'like', "%{$search}%")
                  ->orWhere('course_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('teacher_id')) {
            $query->where('teacher_id', $request->query('teacher_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $courses = $query->orderBy('course_code')->get();

        // Attach is_enrolled for authenticated student
        if ($user) {
            $enrolledCourseIds = CourseEnrollment::where('student_id', $user->id)
                ->where('status', 'enrolled')
                ->pluck('course_id')
                ->toArray();

            $courses->transform(function ($course) use ($enrolledCourseIds) {
                $course->is_enrolled = in_array($course->id, $enrolledCourseIds);
                return $course;
            });
        }

        return response()->json($courses);
    }

    /**
     * Get courses relevant to authenticated user (Teacher's own courses or Student's enrolled courses).
     */
    public function myCourses(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'teacher') {
            $courses = Course::where('teacher_id', $user->id)
                ->with(['schedules', 'assignments'])
                ->withCount(['enrollments as enrolled_count' => function ($q) {
                    $q->where('status', 'enrolled');
                }])
                ->with(['students' => function ($q) {
                    $q->select('users.id', 'users.name', 'users.email')
                      ->wherePivot('status', 'enrolled');
                }])
                ->orderBy('course_code')
                ->get();

            return response()->json($courses);
        }

        if ($user->role === 'student') {
            $enrolledIds = CourseEnrollment::where('student_id', $user->id)
                ->where('status', 'enrolled')
                ->pluck('course_id');

            $courses = Course::whereIn('id', $enrolledIds)
                ->with(['teacher:id,name,email', 'schedules', 'assignments'])
                ->withCount(['enrollments as enrolled_count' => function ($q) {
                    $q->where('status', 'enrolled');
                }])
                ->orderBy('course_code')
                ->get();

            $courses->transform(function ($c) {
                $c->is_enrolled = true;
                return $c;
            });

            return response()->json($courses);
        }

        // Admin returns all courses with teacher & student counts
        $courses = Course::with(['teacher:id,name,email', 'schedules', 'assignments'])
            ->withCount(['enrollments as enrolled_count' => function ($q) {
                $q->where('status', 'enrolled');
            }])
            ->orderBy('course_code')
            ->get();

        return response()->json($courses);
    }

    /**
     * Find course by id, course_code, or normalized code.
     */
    private function findCourse(string $identifier): ?Course
    {
        $id = trim($identifier);
        $cleanId = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $id));

        return Course::where('id', $id)
            ->orWhere('course_code', $id)
            ->orWhereRaw('REPLACE(REPLACE(UPPER(course_code), " ", ""), "-", "") = ?', [$cleanId])
            ->orWhereRaw('REPLACE(REPLACE(UPPER(id), " ", ""), "-", "") = ?', [$cleanId])
            ->first();
    }

    /**
     * Get single course details.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $course = $this->findCourse($id);

        if (!$course) {
            return response()->json(['message' => 'Course not found'], 404);
        }

        $course->load(['teacher:id,name,email', 'schedules', 'assignments']);
        $course->loadCount(['enrollments as enrolled_count' => function ($q) {
            $q->where('status', 'enrolled');
        }]);

        if ($user && ($user->role === 'admin' || $course->teacher_id == $user->id)) {
            $course->load(['students' => function ($q) {
                $q->select('users.id', 'users.name', 'users.email')
                  ->wherePivot('status', 'enrolled');
            }]);
        }

        if ($user) {
            $isEnrolled = CourseEnrollment::where('student_id', $user->id)
                ->where('course_id', $course->id)
                ->where('status', 'enrolled')
                ->exists();
            $course->is_enrolled = $isEnrolled;
        }

        return response()->json($course);
    }

    /**
     * Store new course (Admin or Teacher).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden. Teacher or Admin access required.'], 403);
        }

        $validated = $request->validate([
            'id' => 'nullable|string|unique:courses,id',
            'course_code' => 'required|string|max:50|unique:courses,course_code',
            'course_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'section' => 'nullable|string|max:20',
            'capacity' => 'required|integer|min:1',
            'status' => 'nullable|string|in:active,inactive',
            'teacher_id' => 'nullable|exists:users,id',
        ]);

        if (empty($validated['id'])) {
            $codeClean = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $validated['course_code']));
            $validated['id'] = $codeClean ?: ('crs-' . Str::padLeft(Course::count() + 1, 3, '0'));
        }

        // If teacher, strictly force teacher_id to authenticated teacher
        if ($user->role === 'teacher') {
            $validated['teacher_id'] = $user->id;
        } elseif (empty($validated['teacher_id'])) {
            $validated['teacher_id'] = $user->id;
        }

        if (empty($validated['section'])) {
            $validated['section'] = 'A';
        }
        if (empty($validated['status'])) {
            $validated['status'] = 'active';
        }

        $course = Course::create($validated);
        $course->load('teacher:id,name,email');
        $course->enrolled_count = 0;

        return response()->json($course, 201);
    }

    /**
     * Update course (Admin or Owner Teacher).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $course = Course::where('id', $id)->orWhere('course_code', $id)->first();

        if (!$course) {
            return response()->json(['message' => 'Course not found'], 404);
        }

        // RBAC: If teacher, must be course owner
        if ($user->role === 'teacher' && $course->teacher_id != $user->id) {
            return response()->json(['message' => 'Forbidden. You do not have permission to modify another teacher\'s course.'], 403);
        }

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden. Unauthorized role.'], 403);
        }

        $validated = $request->validate([
            'course_code' => 'sometimes|required|string|max:50|unique:courses,course_code,' . $course->id,
            'course_name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'section' => 'nullable|string|max:20',
            'capacity' => 'sometimes|required|integer|min:1',
            'status' => 'nullable|string|in:active,inactive',
            'teacher_id' => 'nullable|exists:users,id',
        ]);

        // Teachers cannot reassign course owner
        if ($user->role === 'teacher') {
            unset($validated['teacher_id']);
        }

        $course->update($validated);
        $course->load('teacher:id,name,email');
        $course->enrolled_count = CourseEnrollment::where('course_id', $course->id)->where('status', 'enrolled')->count();

        return response()->json($course);
    }

    /**
     * Delete / Deactivate course (Admin or Owner Teacher).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $course = Course::where('id', $id)->orWhere('course_code', $id)->first();

        if (!$course) {
            return response()->json(['message' => 'Course not found'], 404);
        }

        // RBAC: If teacher, must be course owner
        if ($user->role === 'teacher' && $course->teacher_id != $user->id) {
            return response()->json(['message' => 'Forbidden. You cannot delete another teacher\'s course.'], 403);
        }

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $course->delete();

        return response()->json(['message' => "Course '{$course->course_code}' deleted successfully."]);
    }

    /**
     * Student Course Enrollment.
     */
    public function enroll(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $course = $this->findCourse($id);
        if (!$course) {
            return response()->json(['message' => 'Course not found.'], 404);
        }

        if ($course->status !== 'active') {
            return response()->json(['message' => 'This course is currently unavailable for enrollment.'], 422);
        }

        $existing = CourseEnrollment::where('student_id', $user->id)
            ->where('course_id', $course->id)
            ->first();

        if ($existing && $existing->status === 'enrolled') {
            return response()->json(['message' => 'Already enrolled in this course.'], 422);
        }

        // Check capacity
        $currentEnrolled = CourseEnrollment::where('course_id', $course->id)
            ->where('status', 'enrolled')
            ->count();

        if ($currentEnrolled >= $course->capacity) {
            return response()->json(['message' => 'This course has reached its enrollment capacity.'], 422);
        }

        if ($existing) {
            $existing->update([
                'status' => 'enrolled',
                'enrolled_at' => now(),
            ]);
            $enrollment = $existing;
        } else {
            $enrollment = CourseEnrollment::create([
                'student_id' => $user->id,
                'course_id' => $course->id,
                'status' => 'enrolled',
                'enrolled_at' => now(),
            ]);
        }

        $updatedCount = CourseEnrollment::where('course_id', $course->id)->where('status', 'enrolled')->count();

        return response()->json([
            'message' => "Successfully enrolled in {$course->course_code} ({$course->course_name})!",
            'enrollment' => $enrollment,
            'course' => [
                'id' => $course->id,
                'course_code' => $course->course_code,
                'course_name' => $course->course_name,
                'capacity' => $course->capacity,
                'enrolled_count' => $updatedCount,
                'is_enrolled' => true,
            ]
        ], 201);
    }

    /**
     * Student Drop Course.
     */
    public function drop(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $course = $this->findCourse($id);
        if (!$course) {
            return response()->json(['message' => 'Course not found.'], 404);
        }

        $enrollment = CourseEnrollment::where('student_id', $user->id)
            ->where('course_id', $course->id)
            ->first();

        if (!$enrollment || $enrollment->status !== 'enrolled') {
            return response()->json(['message' => 'You are not enrolled in this course.'], 422);
        }

        $enrollment->delete();

        $updatedCount = CourseEnrollment::where('course_id', $course->id)->where('status', 'enrolled')->count();

        return response()->json([
            'message' => "Successfully dropped course {$course->course_code}.",
            'course' => [
                'id' => $course->id,
                'course_code' => $course->course_code,
                'course_name' => $course->course_name,
                'capacity' => $course->capacity,
                'enrolled_count' => $updatedCount,
                'is_enrolled' => false,
            ]
        ]);
    }

    /**
     * View enrolled students for a course (Teacher owner or Admin).
     */
    public function students(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $course = $this->findCourse($id);

        if (!$course) {
            return response()->json(['message' => 'Course not found'], 404);
        }

        if ($user->role === 'teacher' && $course->teacher_id != $user->id) {
            return response()->json(['message' => 'Forbidden. You do not own this course.'], 403);
        }

        if (!in_array($user->role, ['admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $students = $course->students()
            ->wherePivot('status', 'enrolled')
            ->get(['users.id', 'users.name', 'users.email', 'course_enrollments.enrolled_at']);

        return response()->json([
            'course' => [
                'id' => $course->id,
                'course_code' => $course->course_code,
                'course_name' => $course->course_name,
                'capacity' => $course->capacity,
                'enrolled_count' => $students->count(),
            ],
            'students' => $students,
        ]);
    }

    /**
     * List all teachers (for Admin course creation / filters).
     */
    public function teachers(): JsonResponse
    {
        $teachers = User::whereIn('role', ['teacher', 'admin'])
            ->select('id', 'name', 'email', 'role')
            ->orderBy('name')
            ->get();

        return response()->json($teachers);
    }
}
