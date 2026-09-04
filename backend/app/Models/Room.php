<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'room_number',
        'type',
        'capacity',
        'equipment',
        'floor',
        'status',
        'bookings',
    ];

    protected $casts = [
        'equipment' => 'array',
        'bookings' => 'array',
        'capacity' => 'integer',
        'floor' => 'integer',
    ];
}
