<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'course',
        'title',
        'day',
        'start_time',
        'end_time',
        'room',
        'instructor',
        'section',
    ];
}