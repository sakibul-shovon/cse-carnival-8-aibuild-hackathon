<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Assignment extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
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

    protected $casts = [
        'marks' => 'integer',
    ];
}
