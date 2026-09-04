<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Assignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'course',
        'course_title',
        'title',
        'description',
        'assigned_date',
        'deadline',
        'submission_platform',
        'status',
        'marks',
    ];
}