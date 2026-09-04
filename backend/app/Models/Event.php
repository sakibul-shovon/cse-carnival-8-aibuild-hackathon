<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
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
        'status',
    ];

    public function registrations()
    {
        return $this->hasMany(EventRegistration::class);
    }
}