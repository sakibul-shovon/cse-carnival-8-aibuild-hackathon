<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomBooking extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_id',
        'booked_by',
        'date',
        'start_time',
        'end_time',
        'purpose',
    ];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }
}