<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'description',
        'date',
        'start_time',
        'end_time',
        'end_date',
        'venue',
        'organizer',
        'capacity',
        'registered',
        'registrations',
        'status',
    ];

    protected $casts = [
        'registrations' => 'array',
        'capacity' => 'integer',
        'registered' => 'integer',
    ];
}
