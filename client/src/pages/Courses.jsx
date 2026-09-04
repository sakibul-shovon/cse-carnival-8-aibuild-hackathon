import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { courseService } from '../services/api';
import {
  BookOpen,
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  UserMinus,
  GraduationCap,
  Calendar,
  Layers,
  X,
  RefreshCw,
  Info,
  Sparkles,
  KeyRound,
  ArrowRight,
  Zap,
  Check,
  Award
} from 'lucide-react';

export default function Courses() {
  const { user, isAdmin, isTeacher, isStudent } = useAuth();
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(isTeacher ? 'my_courses' : 'all'); // 'all' | 'my_courses'
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [studentModalCourse, setStudentModalCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  
  // Quick ID/Code Join Modal State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCourseIdInput, setJoinCourseIdInput] = useState('');
  const [joinError, setJoinError] = useState('');

  // Create / Edit Modal State
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    department: 'CSE',
    credits: 3,
    teacher_id: '',
    capacity: 40,
    description: '',
    syllabus: '',
    status: 'active'
  });
  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  useEffect(() => {
    fetchCourses();
    if (isAdmin || isTeacher) {
      fetchTeachers();
    }
  }, [activeTab]);

  const showNotification = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      if (activeTab === 'my_courses') {
        const res = await courseService.getMyCourses();
        setCourses(res.data || []);
      } else {
        const res = await courseService.getAll();
        setCourses(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await courseService.getTeachers();
      setTeachers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    }
  };

  const handleEnroll = async (courseIdOrCode) => {
    setActionLoading(true);
    try {
      const res = await courseService.enroll(courseIdOrCode);
      showNotification(res.message || 'Successfully enrolled in course!');
      fetchCourses();
      return true;
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to enroll in course.', 'error');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickJoinSubmit = async (e) => {
    e.preventDefault();
    setJoinError('');
    const target = joinCourseIdInput.trim();
    if (!target) {
      setJoinError('Please enter a valid Course Code or Course ID.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await courseService.enroll(target);
      showNotification(res.message || `Successfully joined course ${target}!`);
      setShowJoinModal(false);
      setJoinCourseIdInput('');
      fetchCourses();
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Could not join course with that ID/Code. Please check and try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDrop = async (courseId) => {
    if (!window.confirm('Are you sure you want to drop this course?')) return;
    setActionLoading(true);
    try {
      const res = await courseService.drop(courseId);
      showNotification(res.message || 'Course dropped successfully.', 'info');
      fetchCourses();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to drop course.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewStudents = async (course) => {
    setStudentModalCourse(course);
    setStudentsLoading(true);
    try {
      const res = await courseService.getStudents(course.id);
      setEnrolledStudents(res.data || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setFormData({
      course_code: '',
      course_name: '',
      department: 'CSE',
      credits: 3,
      teacher_id: isTeacher ? user.id : (teachers[0]?.id || ''),
      capacity: 40,
      description: '',
      syllabus: '',
      status: 'active'
    });
    setFormError('');
    setShowCourseModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCourse(c);
    setFormData({
      course_code: c.course_code,
      course_name: c.course_name,
      department: c.department || 'CSE',
      credits: c.credits || 3,
      teacher_id: c.teacher_id || '',
      capacity: c.capacity || 40,
      description: c.description || '',
      syllabus: c.syllabus || '',
      status: c.status || 'active'
    });
    setFormError('');
    setShowCourseModal(true);
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);
    try {
      if (editingCourse) {
        await courseService.update(editingCourse.id, formData);
        showNotification(`Course ${formData.course_code} updated successfully.`);
      } else {
        await courseService.create(formData);
        showNotification(`Course ${formData.course_code} created successfully.`);
      }
      setShowCourseModal(false);
      fetchCourses();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save course. Check fields.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? All associated enrollments will be removed.')) return;
    try {
      await courseService.delete(courseId);
      showNotification('Course deleted successfully.', 'info');
      fetchCourses();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete course.', 'error');
    }
  };

  const filteredCourses = courses.filter(c => {
    const query = search.toLowerCase();
    return (
      (c.id && c.id.toLowerCase().includes(query)) ||
      c.course_code.toLowerCase().includes(query) ||
      c.course_name.toLowerCase().includes(query) ||
      (c.teacher?.name && c.teacher.name.toLowerCase().includes(query)) ||
      (c.department && c.department.toLowerCase().includes(query))
    );
  });

  const enrolledCountTotal = courses.filter(c => c.is_enrolled).length;
  const totalCreditsEnrolled = courses
    .filter(c => c.is_enrolled)
    .reduce((sum, c) => sum + (Number(c.credits) || 3), 0);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback.message && (
        <div className={`p-4 rounded-2xl flex items-center justify-between shadow-xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
          feedback.type === 'error'
            ? 'bg-rose-50/95 border-rose-200 text-rose-800'
            : feedback.type === 'info'
            ? 'bg-blue-50/95 border-blue-200 text-blue-800'
            : 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-3">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <span className="text-sm font-semibold">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback({ message: '', type: '' })} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header Banner with Glow & Quick Join CTA */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-10 w-56 h-56 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Academic Curriculum Portal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-linear-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Courses & Enrollment
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              {isStudent && "Join classes instantly with Course ID/Code, explore the university syllabus, and keep track of your semester credits."}
              {isTeacher && "Oversee your assigned lecture modules, monitor student roster capacities, and broadcast course content."}
              {isAdmin && "Comprehensive university course catalog administration, faculty allocation, and capacity governance."}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {isStudent && (
              <button
                onClick={() => setShowJoinModal(true)}
                className="group relative inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-linear-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <KeyRound className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" />
                <span>Join by Course ID</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {(isAdmin || isTeacher) && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Course</span>
              </button>
            )}

            <button
              onClick={fetchCourses}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 backdrop-blur-xs transition cursor-pointer"
              title="Refresh Courses"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar for Students */}
        {isStudent && (
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Enrolled Courses</p>
                <p className="text-sm font-extrabold text-white">{enrolledCountTotal} Classes</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Credits</p>
                <p className="text-sm font-extrabold text-white">{totalCreditsEnrolled} Credits</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Direct Access</p>
                <p className="text-sm font-extrabold text-emerald-400">Instant Enrollment</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search & Tabs Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex p-1.5 bg-slate-200/70 dark:bg-slate-800 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Courses Catalog
          </button>
          <button
            onClick={() => setActiveTab('my_courses')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'my_courses'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isTeacher ? 'My Teaching Courses' : isStudent ? 'My Enrolled Courses' : 'Faculty Course View'}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ID, course code, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
            <BookOpen className="w-5 h-5 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-4 animate-pulse">Loading university catalog...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No courses found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {activeTab === 'my_courses'
              ? (isTeacher ? "You have not been assigned to any courses yet." : "You are not enrolled in any courses yet. Switch to 'All Courses Catalog' or join directly with Course ID.")
              : "No courses matched your query. Try searching by Course Code like 'CSE 321' or 'CSE'."}
          </p>
          {isStudent && activeTab === 'my_courses' && (
            <button
              onClick={() => setShowJoinModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Join Course with ID</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((c) => {
            const isFull = c.is_full || (c.enrolled_count >= c.capacity);
            const isMyCourse = isTeacher && c.teacher_id === user?.id;
            const percentFilled = Math.min(100, Math.round(((c.enrolled_count || 0) / (c.capacity || 40)) * 100));

            return (
              <div
                key={c.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
              >
                {/* Course Card Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-extrabold tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                        {c.course_code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        ID: {c.id}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {c.credits} Cr
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {c.is_enrolled && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Enrolled
                        </span>
                      )}
                      {isMyCourse && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Instructor
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors duration-200 line-clamp-1">
                    {c.course_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {c.description || "Comprehensive university coursework covering fundamental and advanced topics."}
                  </p>
                </div>

                {/* Course Stats, Instructor & Capacity Progress */}
                <div className="px-6 py-4 bg-slate-50/80 border-t border-b border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-slate-800 truncate">{c.teacher?.name || 'Faculty TBA'}</p>
                        <p className="text-[10px] text-slate-400 truncate">{c.teacher?.email || 'Department of CSE'}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1 font-extrabold text-xs">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className={isFull ? 'text-rose-600' : 'text-slate-800'}>
                          {c.enrolled_count || 0} / {c.capacity || 40}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold ${isFull ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {isFull ? 'Section Full' : `${(c.capacity || 40) - (c.enrolled_count || 0)} seats left`}
                      </span>
                    </div>
                  </div>

                  {/* Visual Capacity Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        percentFilled >= 100
                          ? 'bg-rose-500'
                          : percentFilled >= 75
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${percentFilled}%` }}
                    ></div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 px-6 bg-white flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {(isAdmin || isMyCourse) && (
                      <button
                        onClick={() => handleViewStudents(c)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                        title="View Roster"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Roster</span>
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                          title="Edit Course"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(c.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Delete Course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Student Action Buttons */}
                  {isStudent && (
                    <div>
                      {c.is_enrolled ? (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleDrop(c.id)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Drop</span>
                        </button>
                      ) : (
                        <button
                          disabled={actionLoading || isFull}
                          onClick={() => handleEnroll(c.id)}
                          className={`flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold rounded-xl transition duration-200 shadow-md cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] ${
                            isFull
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isFull ? 'Full' : 'Join Course'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join Course by ID Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Join Course with ID / Code
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter the Course ID or Course Code given by your faculty
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {joinError && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleQuickJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Course ID or Course Code *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. CSE321 or crs-001"
                    value={joinCourseIdInput}
                    onChange={(e) => setJoinCourseIdInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                    INSTANT
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Tip: You can pass either exact code (e.g. <span className="font-mono font-bold text-indigo-600">CSE 321</span>) or the identifier (<span className="font-mono font-bold text-indigo-600">CSE321</span> / <span className="font-mono font-bold text-indigo-600">crs-001</span>).
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinError('');
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !joinCourseIdInput.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{actionLoading ? 'Enrolling...' : 'Join Course Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Roster / Enrolled Students Modal */}
      {studentModalCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Enrolled Students Roster
                </h3>
                <p className="text-xs text-slate-500">
                  {studentModalCourse.course_code} - {studentModalCourse.course_name}
                </p>
              </div>
              <button
                onClick={() => setStudentModalCourse(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {studentsLoading ? (
              <div className="py-12 flex justify-center">
                <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No students enrolled in this course yet.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {enrolledStudents.map((enr) => (
                  <div
                    key={enr.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        {enr.student?.name?.[0] || 'S'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{enr.student?.name || 'Student'}</p>
                        <p className="text-[11px] text-slate-500">{enr.student?.email}</p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-400">
                      <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        {enr.status}
                      </span>
                      <p className="mt-1">Joined: {enr.enrolled_at ? new Date(enr.enrolled_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setStudentModalCourse(null)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingCourse ? `Edit Course ${editingCourse.course_code}` : 'Create New University Course'}
              </h3>
              <button
                onClick={() => setShowCourseModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE 321"
                    value={formData.course_code}
                    onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Credits *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="6"
                    required
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Course Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems & System Programming"
                  value={formData.course_name}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Teacher / Faculty
                  </label>
                  <select
                    disabled={isTeacher && !isAdmin}
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Student Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Course Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Overview, prerequisites, and learning outcomes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

