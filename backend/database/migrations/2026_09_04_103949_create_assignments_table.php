<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignments', function (Blueprint $table) {
            $table->id();
            $table->string('course');
            $table->string('course_title')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('assigned_date')->nullable();
            $table->date('deadline');
            $table->string('submission_platform')->nullable();
            $table->string('status')->default('pending');
            $table->integer('marks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};