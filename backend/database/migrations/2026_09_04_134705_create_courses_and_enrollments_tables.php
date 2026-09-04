<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->string('id')->primary(); // e.g. crs-001 or CSE321
            $table->string('course_code')->unique(); // e.g. CSE321, CSE 4113
            $table->string('course_name'); // e.g. Computer Networks
            $table->text('description')->nullable();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('section')->default('A');
            $table->integer('capacity')->default(40);
            $table->string('status')->default('active'); // active, inactive
            $table->timestamps();
        });

        Schema::create('course_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->string('course_id');
            $table->foreign('course_id')->references('id')->on('courses')->cascadeOnDelete();
            $table->string('status')->default('enrolled'); // enrolled, dropped
            $table->timestamp('enrolled_at')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'course_id']);
        });

        // Add optional teacher_id to assignments if not present
        if (!Schema::hasColumn('assignments', 'teacher_id')) {
            Schema::table('assignments', function (Blueprint $table) {
                $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('course_enrollments');
        Schema::dropIfExists('courses');

        if (Schema::hasColumn('assignments', 'teacher_id')) {
            Schema::table('assignments', function (Blueprint $table) {
                $table->dropForeign(['teacher_id']);
                $table->dropColumn('teacher_id');
            });
        }
    }
};
