import React from 'react';
import { Building2, PartyPopper, CheckCircle } from 'lucide-react';

export default function ActionCard({ card }) {
  if (!card) return null;

  if (card.type === 'room_booking') {
    return (
      <div className="my-3 p-4 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-emerald-300 dark:border-emerald-700/80 shadow-md text-black dark:text-emerald-50">
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-emerald-200 dark:border-emerald-700/60">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200">
              <Building2 className="w-4 h-4" />
            </span>
            <h4 className="font-bold text-black dark:text-white text-sm">
              {card.title || 'Room Booking Confirmed'}
            </h4>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/30">
            <CheckCircle className="w-3 h-3" /> Confirmed
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-black dark:text-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-black font-semibold dark:text-emerald-400/80">Room Number:</span>
            <span className="font-bold font-mono text-black dark:text-white">{card.room_number}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-black font-semibold dark:text-emerald-400/80">Date:</span>
            <span className="font-bold text-black dark:text-emerald-100">{card.date}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-black font-semibold dark:text-emerald-400/80">Time Slot:</span>
            <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">{card.time}</span>
          </div>

          {card.booked_by && (
            <div className="flex items-center justify-between">
              <span className="text-black font-semibold dark:text-emerald-400/80">Booked By:</span>
              <span className="font-medium text-black dark:text-emerald-100">{card.booked_by}</span>
            </div>
          )}

          {card.purpose && (
            <div className="flex items-center justify-between">
              <span className="text-black font-semibold dark:text-emerald-400/80">Purpose:</span>
              <span className="text-black dark:text-emerald-300 italic">{card.purpose}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (card.type === 'event_registration') {
    return (
      <div className="my-3 p-4 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-teal-300 dark:border-teal-700/80 shadow-md text-black dark:text-teal-50">
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-teal-200 dark:border-teal-700/60">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-800 text-teal-900 dark:text-teal-200">
              <PartyPopper className="w-4 h-4" />
            </span>
            <h4 className="font-bold text-black dark:text-white text-sm">
              {card.title || 'Event Registration Confirmed'}
            </h4>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-900 dark:text-teal-300 bg-teal-100 dark:bg-teal-500/20 px-2 py-0.5 rounded-full border border-teal-300 dark:border-teal-500/30">
            <CheckCircle className="w-3 h-3" /> Registered
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-black dark:text-teal-200">
          <div className="flex items-center justify-between">
            <span className="text-black font-semibold dark:text-teal-400/80">Event:</span>
            <span className="font-bold text-black dark:text-white text-right truncate max-w-[200px]">{card.event_name}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-black font-semibold dark:text-teal-400/80">Venue:</span>
            <span className="font-bold text-black dark:text-teal-100">{card.venue}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-black font-semibold dark:text-teal-400/80">Schedule:</span>
            <span className="font-mono font-bold text-teal-800 dark:text-teal-300">{card.date}</span>
          </div>

          {card.student_name && (
            <div className="flex items-center justify-between">
              <span className="text-black font-semibold dark:text-teal-400/80">Attendee:</span>
              <span className="font-medium text-black dark:text-teal-100">
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
