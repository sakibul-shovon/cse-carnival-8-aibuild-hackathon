<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\Event;
use App\Models\Room;
use App\Models\Schedule;
use App\Models\User;
use App\Services\AgentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $refNow = AgentService::getReferenceNow();
        $currentDayName = $refNow->format('l');

        // Global baseline counts
        $totalSchedules = Schedule::count();
        $totalRooms = Room::count();
        $availableRooms = Room::where('status', 'available')->count();
        $totalEvents = Event::count();
        $upcomingEvents = Event::where('status', 'upcoming')->count();
        $totalAnnouncements = Announcement::count();
        $highPriorityAnnouncements = Announcement::where('priority', 'high')->count();
        $totalAssignments = Assignment::count();
        $pendingAssignments = Assignment::where('status', 'pending')->count();
        $totalCourses = Course::count();
        $activeCourses = Course::where('status', 'active')->count();
        $totalEnrollments = CourseEnrollment::where('status', 'enrolled')->count();
        $totalTeachers = User::where('role', 'teacher')->count();

        // 1. TEACHER SPECIFIC DASHBOARD
        if ($user && $user->role === 'teacher') {
            $myCourses = Course::where('teacher_id', $user->id)
                ->withCount(['enrollments as enrolled_count' => function ($q) {
                    $q->where('status', 'enrolled');
                }])
                ->get();

            $myCourseCodes = $myCourses->pluck('course_code')->toArray();
            $myCourseIds = $myCourses->pluck('id')->toArray();

            $totalEnrolledStudents = CourseEnrollment::whereIn('course_id', $myCourseIds)
                ->where('status', 'enrolled')
                ->distinct('student_id')
                ->count('student_id');

            $todayTeacherSchedules = Schedule::whereIn('course', $myCourseCodes)
                ->orWhere('instructor', 'like', "%{$user->name}%")
                ->orderBy('start_time')
                ->get();

            $myAssignments = Assignment::where(function ($q) use ($user, $myCourseCodes) {
                $q->where('teacher_id', $user->id)
                  ->orWhereIn('course', $myCourseCodes);
            })->orderBy('deadline')->take(6)->get();

            $myEvents = Event::where('organizer', 'like', "%{$user->name}%")
                ->orWhereIn('status', ['upcoming', 'ongoing'])
                ->orderBy('date')
                ->take(5)
                ->get();

            $myAnnouncements = Announcement::where('posted_by', 'like', "%{$user->name}%")
                ->orWhere('priority', 'high')
                ->orderByDesc('date')
                ->take(5)
                ->get();

            return response()->json([
                'role' => 'teacher',
                'counts' => [
                    'my_courses' => $myCourses->count(),
                    'total_enrolled_students' => $totalEnrolledStudents,
                    'today_classes' => $todayTeacherSchedules->count(),
                    'upcoming_assignments' => $myAssignments->where('status', 'pending')->count(),
                    'upcoming_events' => $upcomingEvents,
                    'total_courses' => $totalCourses,
                ],
                'my_courses' => $myCourses,
                'today_schedules' => $todayTeacherSchedules,
                'recent_assignments' => $myAssignments,
                'upcoming_events' => $myEvents,
                'recent_announcements' => $myAnnouncements,
            ]);
        }

        // 2. STUDENT SPECIFIC DASHBOARD
        if ($user && $user->role === 'student') {
            $enrolledCourseIds = CourseEnrollment::where('student_id', $user->id)
                ->where('status', 'enrolled')
                ->pluck('course_id');

            $enrolledCourses = Course::whereIn('id', $enrolledCourseIds)
                ->with(['teacher:id,name,email'])
                ->withCount(['enrollments as enrolled_count' => function ($q) {
                    $q->where('status', 'enrolled');
                }])
                ->get();

            $enrolledCourseCodes = $enrolledCourses->pluck('course_code')->toArray();

            $todayStudentSchedules = Schedule::whereIn('course', $enrolledCourseCodes)
                ->orderBy('start_time')
                ->get();

            if ($todayStudentSchedules->isEmpty()) {
                $todayStudentSchedules = Schedule::where('day', $currentDayName)
                    ->orderBy('start_time')
                    ->take(6)
                    ->get();
            }

            $enrolledAssignments = Assignment::whereIn('course', $enrolledCourseCodes)
                ->where('status', 'pending')
                ->orderBy('deadline')
                ->take(6)
                ->get();

            if ($enrolledAssignments->isEmpty()) {
                $enrolledAssignments = Assignment::where('status', 'pending')
                    ->orderBy('deadline')
                    ->take(6)
                    ->get();
            }

            $upcomingEventsList = Event::whereIn('status', ['upcoming', 'ongoing'])
                ->orderBy('date')
                ->take(5)
                ->get();

            $recentAnnouncements = Announcement::orderByDesc('date')
                ->take(5)
                ->get();

            return response()->json([
                'role' => 'student',
                'counts' => [
                    'enrolled_courses' => $enrolledCourses->count(),
                    'today_classes' => $todayStudentSchedules->count(),
                    'pending_assignments' => $enrolledAssignments->count(),
                    'upcoming_events' => $upcomingEvents,
                    'available_rooms' => $availableRooms,
                    'total_announcements' => $totalAnnouncements,
                ],
                'enrolled_courses' => $enrolledCourses,
                'today_schedules' => $todayStudentSchedules,
                'upcoming_assignments' => $enrolledAssignments,
                'upcoming_events' => $upcomingEventsList,
                'recent_announcements' => $recentAnnouncements,
            ]);
        }

        // 3. ADMIN DASHBOARD
        $recentAnnouncements = Announcement::orderByDesc('date')->take(5)->get();
        $upcomingEventsList = Event::whereIn('status', ['upcoming', 'ongoing'])->orderBy('date')->take(5)->get();
        $upcomingAssignmentsList = Assignment::where('status', 'pending')->orderBy('deadline')->take(5)->get();
        $todaySchedules = Schedule::orderBy('start_time')->take(6)->get();
        $coursesList = Course::with(['teacher:id,name,email'])
            ->withCount(['enrollments as enrolled_count' => function ($q) {
                $q->where('status', 'enrolled');
            }])
            ->take(6)
            ->get();

        return response()->json([
            'role' => 'admin',
            'counts' => [
                'schedules' => $totalSchedules,
                'rooms' => $totalRooms,
                'available_rooms' => $availableRooms,
                'events' => $totalEvents,
                'upcoming_events' => $upcomingEvents,
                'announcements' => $totalAnnouncements,
                'high_priority_announcements' => $highPriorityAnnouncements,
                'assignments' => $totalAssignments,
                'pending_assignments' => $pendingAssignments,
                'courses' => $totalCourses,
                'active_courses' => $activeCourses,
                'total_enrollments' => $totalEnrollments,
                'total_teachers' => $totalTeachers,
            ],
            'recent_announcements' => $recentAnnouncements,
            'upcoming_events' => $upcomingEventsList,
            'upcoming_assignments' => $upcomingAssignmentsList,
            'today_schedules' => $todaySchedules,
            'recent_courses' => $coursesList,
        ]);
    }
}
