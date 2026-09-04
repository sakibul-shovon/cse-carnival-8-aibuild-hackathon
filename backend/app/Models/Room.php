<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_number',
        'type',
        'capacity',
        'equipment',
        'floor',
        'status',
    ];

    protected $casts = [
        'equipment' => 'array',
    ];

    public function bookings()
    {
        return $this->hasMany(RoomBooking::class);
    }
}