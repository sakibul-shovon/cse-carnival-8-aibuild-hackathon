<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
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
