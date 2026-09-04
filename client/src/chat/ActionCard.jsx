import React from 'react';
import { Building2, PartyPopper, Calendar, Clock, MapPin, User, CheckCircle, Sparkles } from 'lucide-react';

export default function ActionCard({ card }) {
  if (!card) return null;

  if (card.type === 'room_booking') {
    return (
      <div className="my-3 p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900/90 to-slate-900 border border-amber-500/30 shadow-xl shadow-amber-950/20 text-slate-100">
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Building2 className="w-4 h-4" />
            </span>
            <h4 className="font-bold text-white text-sm">{card.title || 'Room Booking Confirmed'}</h4>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" /> Confirmed
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Room Number:</span>
            <span className="font-bold text-white font-mono">{card.room_number}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Date:</span>
            <span className="font-semibold text-slate-200">{card.date}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Time Slot:</span>
            <span className="font-mono text-amber-300 font-semibold">{card.time}</span>
          </div>

          {card.booked_by && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Booked By:</span>
              <span className="text-slate-200 font-medium">{card.booked_by}</span>
            </div>
          )}

          {card.purpose && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Purpose:</span>
              <span className="text-slate-300 italic">{card.purpose}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (card.type === 'event_registration') {
    return (
      <div className="my-3 p-4 rounded-2xl bg-gradient-to-br from-purple-500/15 via-slate-900/90 to-slate-900 border border-purple-500/30 shadow-xl shadow-purple-950/20 text-slate-100">
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
              <PartyPopper className="w-4 h-4" />
            </span>
            <h4 className="font-bold text-white text-sm">{card.title || 'Event Registration Confirmed'}</h4>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" /> Registered
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Event:</span>
            <span className="font-bold text-white text-right truncate max-w-[200px]">{card.event_name}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Venue:</span>
            <span className="font-semibold text-slate-200">{card.venue}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Schedule:</span>
            <span className="font-mono text-purple-300 font-semibold">{card.date}</span>
          </div>

          {card.student_name && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Attendee:</span>
              <span className="text-slate-200 font-medium">
                {card.student_name} ({card.student_id})
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
