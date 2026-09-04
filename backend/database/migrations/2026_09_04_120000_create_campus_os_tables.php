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
        Schema::create('schedules', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('course');
            $table->string('title');
            $table->string('day');
            $table->string('start_time');
            $table->string('end_time');
            $table->string('room');
            $table->string('instructor')->default('TBA');
            $table->string('section')->nullable();
            $table->timestamps();
        });

        Schema::create('rooms', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('room_number')->unique();
            $table->string('type'); // classroom, lab, seminar
            $table->integer('capacity');
            $table->json('equipment')->nullable(); // array of strings
            $table->integer('floor')->default(7);
            $table->string('status')->default('available'); // available, unavailable
            $table->json('bookings')->nullable(); // array of booking objects
            $table->timestamps();
        });

        Schema::create('events', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->text('description');
            $table->string('date');
            $table->string('start_time');
            $table->string('end_time');
            $table->string('end_date');
            $table->string('venue');
            $table->string('organizer');
            $table->integer('capacity');
            $table->integer('registered')->default(0);
            $table->json('registrations')->nullable(); // array of registration objects
            $table->string('status')->default('upcoming'); // upcoming, ongoing, completed, cancelled, full
            $table->timestamps();
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('title');
            $table->text('body');
            $table->string('date');
            $table->string('priority')->default('medium'); // high, medium, low
            $table->string('posted_by');
            $table->string('expires');
            $table->timestamps();
        });

        Schema::create('assignments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('course');
            $table->string('course_title');
            $table->string('title');
            $table->text('description');
            $table->string('assigned_date');
            $table->string('deadline');
            $table->string('submission_platform');
            $table->string('status')->default('pending'); // pending, submitted, graded, late
            $table->integer('marks')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assignments');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('events');
        Schema::dropIfExists('rooms');
        Schema::dropIfExists('schedules');
    }
};
