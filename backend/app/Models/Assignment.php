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
        'teacher_id',
    ];

    protected $casts = [
        'marks' => 'integer',
    ];

    public function courseRelation(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Course::class, 'course', 'course_code');
    }

    public function teacher(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
