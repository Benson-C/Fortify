'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  date_time: string;
  max_capacity: number;
  event_type: string;
  duration: number;
  location: string | null;
  instructor_name: string | null;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getEventsOnDate(events: EventRecord[], dateKey: string): EventRecord[] {
  return events.filter((e) => toDateKey(new Date(e.date_time)) === dateKey);
}

interface EventsCalendarViewProps {
  events: EventRecord[];
  bookedEventIds: string[];
  bookingCounts: Record<string, number>;
}

export default function EventsCalendarView({
  events,
  bookedEventIds,
  bookingCounts,
}: EventsCalendarViewProps) {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const bookedSet = useMemo(() => new Set(bookedEventIds), [bookedEventIds]);
  const datesWithEvents = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(toDateKey(new Date(e.date_time))));
    return set;
  }, [events]);

  const { year, month } = calendarMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  const monthLabel = firstDay.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.date_time) >= now);
  const eventsToShow =
    selectedDateKey != null
      ? getEventsOnDate(events, selectedDateKey).filter(
          (e) => new Date(e.date_time) >= now
        )
      : upcomingEvents;

  return (
    <div className="space-y-8">
      {/* Toggle: Calendar / List */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            viewMode === 'calendar'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white/80 text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Calendar
        </button>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            viewMode === 'list'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white/80 text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          List
        </button>
      </div>

      {viewMode === 'calendar' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() =>
                setCalendarMonth((m) =>
                  m.month === 0
                    ? { year: m.year - 1, month: 11 }
                    : { year: m.year, month: m.month - 1 }
                )
              }
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold"
            >
              ← Prev
            </button>
            <h2 className="text-xl font-bold text-gray-900">{monthLabel}</h2>
            <button
              type="button"
              onClick={() =>
                setCalendarMonth((m) =>
                  m.month === 11
                    ? { year: m.year + 1, month: 0 }
                    : { year: m.year, month: m.month + 1 }
                )
              }
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold"
            >
              Next →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                className="py-2 text-xs font-semibold text-gray-500 uppercase"
              >
                {d}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasEvents = datesWithEvents.has(dateKey);
              const isSelected = selectedDateKey === dateKey;
              const dayEvents = getEventsOnDate(events, dateKey);
              const hasUpcoming = dayEvents.some(
                (e) => new Date(e.date_time) >= now
              );
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() =>
                    setSelectedDateKey(isSelected ? null : dateKey)
                  }
                  className={`aspect-square rounded-xl text-sm font-semibold transition-all ${
                    hasEvents && hasUpcoming
                      ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-200'
                      : hasEvents
                        ? 'bg-gray-200 text-gray-600 border border-gray-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200 border border-gray-200'
                  } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {selectedDateKey && (
            <p className="mt-4 text-sm text-gray-600">
              Showing events on{' '}
              {new Date(selectedDateKey + 'T12:00:00').toLocaleDateString(
                'default',
                {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                }
              )}{' '}
              <button
                type="button"
                onClick={() => setSelectedDateKey(null)}
                className="text-indigo-600 hover:underline font-semibold"
              >
                (show all)
              </button>
            </p>
          )}
        </div>
      )}

      {/* Events list (same cards as before) */}
      <div>
        <h2 className="text-2xl font-bold text-indigo-600 mb-4">
          {selectedDateKey != null
            ? `Events on ${new Date(selectedDateKey + 'T12:00:00').toLocaleDateString()}`
            : 'Upcoming events'}
        </h2>
        {eventsToShow.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventsToShow.map((event) => {
              const bookingCount = bookingCounts[event.id] ?? 0;
              const isBooked = bookedSet.has(event.id);
              const spotsRemaining = event.max_capacity - bookingCount;
              const isFull = spotsRemaining <= 0;

              return (
                <div
                  key={event.id}
                  id={`event-${event.id}`}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 hover:shadow-soft-lg transition-all duration-300 border border-gray-100 hover:border-indigo-200 transform hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-indigo-600 pr-2">
                      {event.title}
                    </h3>
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200">
                      {event.event_type}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium mr-2">Date:</span>
                      <span>
                        {new Date(event.date_time).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium mr-2">Time:</span>
                      <span>
                        {new Date(event.date_time).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium mr-2">Duration:</span>
                      <span>{event.duration} minutes</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-2">Location:</span>
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.instructor_name && (
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-2">Instructor:</span>
                        <span>{event.instructor_name}</span>
                      </div>
                    )}
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium mr-2">Capacity:</span>
                      <span>
                        {bookingCount}/{event.max_capacity} spots filled
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {isBooked ? (
                      <Link
                        href={`/events/book/${event.id}`}
                        className="block w-full bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-4 py-3 rounded-xl text-center font-semibold border border-green-200 hover:from-green-100 hover:to-emerald-100 transition-all"
                      >
                        ✓ You&apos;re booked — View / Cancel
                      </Link>
                    ) : isFull ? (
                      <div className="bg-gray-50 text-gray-600 px-4 py-3 rounded-xl text-center font-semibold border border-gray-200">
                        Fully booked
                      </div>
                    ) : (
                      <Link
                        href={`/events/book/${event.id}`}
                        className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-xl text-center hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transform hover:-translate-y-0.5"
                      >
                        Book Now
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/80 rounded-2xl shadow-soft p-12 text-center border border-gray-100">
            {selectedDateKey != null ? (
              <>
                <p className="text-gray-500 text-lg">
                  No upcoming events on this day.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedDateKey(null)}
                  className="mt-3 text-indigo-600 hover:underline font-semibold"
                >
                  Show all upcoming events
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-500 text-lg">
                  No upcoming events scheduled.
                </p>
                <p className="text-gray-400 mt-2">
                  Check back later for new workout sessions!
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
