'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Event {
  id: string;
  title: string;
  description: string | null;
  date_time: string;
  max_capacity: number;
  event_type: string;
  duration: number;
  location: string | null;
  instructor_name: string | null;
  created_at: string;
}

type RecurrenceFrequency = 'weekly' | 'every_2_weeks' | 'every_month';

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'every_2_weeks', label: 'Every 2 weeks' },
  { value: 'every_month', label: 'Every month' },
];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getEventsOnDate(events: Event[], dateKey: string): Event[] {
  return events.filter((e) => toDateKey(new Date(e.date_time)) === dateKey);
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'list' | 'create'>('list');

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [eventType, setEventType] = useState<
    'fun_assessment_day' | 'dexa_scan' | 'touchpoints'
  >('fun_assessment_day');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<RecurrenceFrequency>('weekly');

  useEffect(() => {
    async function checkAuthAndLoad() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: adminCheck } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!adminCheck) {
        router.push('/dashboard');
        return;
      }

      await loadEvents();
      await loadFavorites();
    }

    checkAuthAndLoad();
  }, [router]);

  useEffect(() => {
    if (selectedDateKey == null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedDateKey]);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .order('date_time', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setEvents(data || []);
    setLoading(false);
  }

  async function loadFavorites() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from('admin_event_favorites')
      .select('event_id')
      .eq('admin_id', user.id);

    if (error) {
      console.error('Error loading favorites:', error);
      return;
    }

    const favoriteSet = new Set((data || []).map((item) => item.event_id));
    setFavoriteIds(favoriteSet);
  }

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

  const eventsOnSelectedDay =
    selectedDateKey != null ? getEventsOnDate(events, selectedDateKey) : [];
  const showCreateInPanel =
    selectedDateKey != null &&
    (panelMode === 'create' || eventsOnSelectedDay.length === 0);

  const openPanel = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    const dayEvents = getEventsOnDate(events, dateKey);
    setPanelMode(dayEvents.length === 0 ? 'create' : 'list');
    if (dayEvents.length === 0) {
      setEventDate(dateKey);
      setEventTime('09:00');
    }
  };

  const closePanel = () => {
    setSelectedDateKey(null);
    setPanelMode('list');
    setEventName('');
    setEventDate('');
    setEventTime('');
    setEventDescription('');
    setMaxParticipants('');
    setEventType('fun_assessment_day');
    setIsRecurring(false);
    setRecurrenceEndDate('');
    setRecurrenceFrequency('weekly');
    setError(null);
  };

  const startCreateOnSelectedDay = () => {
    if (selectedDateKey) {
      setEventDate(selectedDateKey);
      setEventTime('09:00');
      setPanelMode('create');
    }
  };

  const handleToggleFavorite = async (eventId: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const isFavorited = favoriteIds.has(eventId);

    if (isFavorited) {
      const { error } = await supabase
        .from('admin_event_favorites')
        .delete()
        .eq('admin_id', user.id)
        .eq('event_id', eventId);

      if (error) {
        console.error('Error removing favorite:', error);
        return;
      }

      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    } else {
      const { error } = await supabase.from('admin_event_favorites').insert({
        admin_id: user.id,
        event_id: eventId,
      });

      if (error) {
        console.error('Error adding favorite:', error);
        return;
      }

      setFavoriteIds((prev) => new Set(prev).add(eventId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (
      !eventName.trim() ||
      !eventDate ||
      !eventTime ||
      !maxParticipants
    ) {
      setError('Please fill in all required fields');
      setSubmitting(false);
      return;
    }

    const maxParticipantsNum = parseInt(maxParticipants, 10);
    if (isNaN(maxParticipantsNum) || maxParticipantsNum <= 0) {
      setError('Max participants must be a positive number');
      setSubmitting(false);
      return;
    }

    const startDate = new Date(`${eventDate}T${eventTime}`);
    if (isNaN(startDate.getTime())) {
      setError('Invalid date or time');
      setSubmitting(false);
      return;
    }

    let datesToCreate: Date[] = [new Date(startDate)];

    if (isRecurring) {
      if (!recurrenceEndDate.trim()) {
        setError('Please set an end date for the recurring event');
        setSubmitting(false);
        return;
      }
      const end = new Date(recurrenceEndDate);
      end.setHours(23, 59, 59, 999);
      if (isNaN(end.getTime()) || end < startDate) {
        setError('End date must be on or after the start date');
        setSubmitting(false);
        return;
      }
      const allDates: Date[] = [];
      let cur = new Date(startDate);
      const startHours = startDate.getHours();
      const startMins = startDate.getMinutes();
      while (cur <= end) {
        allDates.push(new Date(cur));
        if (recurrenceFrequency === 'weekly') {
          cur.setDate(cur.getDate() + 7);
        } else if (recurrenceFrequency === 'every_2_weeks') {
          cur.setDate(cur.getDate() + 14);
        } else {
          cur.setMonth(cur.getMonth() + 1);
        }
        cur.setHours(startHours, startMins, 0, 0);
      }
      datesToCreate = allDates;
    }

    const supabase = createClient();
    for (const d of datesToCreate) {
      const { error: insertError } = await supabase.from('events').insert({
        title: eventName.trim(),
        description: eventDescription.trim() || null,
        date_time: d.toISOString(),
        max_capacity: maxParticipantsNum,
        duration: 60,
        event_type: eventType,
        location: null,
        instructor_name: null,
      });

      if (insertError) {
        setError(insertError.message);
        setSubmitting(false);
        return;
      }
    }

    closePanel();
    await loadEvents();
    await loadFavorites();
    setSubmitting(false);
  };

  const handleDelete = async (eventId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this event? This action cannot be undone.'
      )
    ) {
      return;
    }

    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadEvents();
    await loadFavorites();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-10">
          <Link
            href="/admin"
            className="text-indigo-600 hover:text-indigo-700 mb-4 inline-flex items-center gap-2 font-semibold transition-colors"
          >
            <span>←</span> Back to Admin Dashboard
          </Link>
          <h1 className="text-5xl font-extrabold text-gray-900 mb-3">
            Manage{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Events
            </span>
          </h1>
          <p className="text-lg text-gray-600">
            Click a date to view or create events
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100 mb-8">
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
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => openPanel(dateKey)}
                  className={`aspect-square rounded-xl text-sm font-semibold transition-all ${
                    hasEvents
                      ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                  } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overlay + panel */}
      {selectedDateKey != null && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={closePanel}
            role="button"
            tabIndex={0}
            aria-label="Close panel"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="panel-title"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 id="panel-title" className="text-2xl font-bold text-indigo-600">
                    {new Date(selectedDateKey + 'T12:00:00').toLocaleDateString(
                      'default',
                      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                    )}
                  </h2>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {showCreateInPanel ? (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <p className="text-gray-600">
                      {eventsOnSelectedDay.length === 0
                        ? 'No events on this day. Create one below.'
                        : 'Create another event on this day.'}
                    </p>
                    <div>
                      <label htmlFor="eventName" className="block text-sm font-semibold text-gray-700 mb-2">
                        Event Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="eventName"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="e.g., Morning Session"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="eventDate" className="block text-sm font-semibold text-gray-700 mb-2">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="eventDate"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="eventTime" className="block text-sm font-semibold text-gray-700 mb-2">
                          Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          id="eventTime"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="eventDescription" className="block text-sm font-semibold text-gray-700 mb-2">
                        Event Description
                      </label>
                      <textarea
                        id="eventDescription"
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        placeholder="Describe the event..."
                      />
                    </div>
                    <div>
                      <label htmlFor="eventType" className="block text-sm font-semibold text-gray-700 mb-2">
                        Event Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="eventType"
                        value={eventType}
                        onChange={(e) =>
                          setEventType(e.target.value as 'fun_assessment_day' | 'dexa_scan' | 'touchpoints')
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        required
                      >
                        <option value="fun_assessment_day">FUN/Assessment Day</option>
                        <option value="dexa_scan">DEXA Scan</option>
                        <option value="touchpoints">Touchpoints</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="maxParticipants" className="block text-sm font-semibold text-gray-700 mb-2">
                        Max Participants <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="maxParticipants"
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(e.target.value)}
                        min={1}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="e.g., 20"
                        required
                      />
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => setIsRecurring(e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          This is a recurring event
                        </span>
                      </label>
                      {isRecurring && (
                        <div className="mt-4 space-y-4 pl-6 border-l-2 border-indigo-100">
                          <div>
                            <label htmlFor="recurrenceEndDate" className="block text-sm font-semibold text-gray-700 mb-2">
                              End Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              id="recurrenceEndDate"
                              value={recurrenceEndDate}
                              onChange={(e) => setRecurrenceEndDate(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label htmlFor="recurrenceFrequency" className="block text-sm font-semibold text-gray-700 mb-2">
                              Recurring frequency
                            </label>
                            <select
                              id="recurrenceFrequency"
                              value={recurrenceFrequency}
                              onChange={(e) =>
                                setRecurrenceFrequency(e.target.value as RecurrenceFrequency)
                              }
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                            >
                              {RECURRENCE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={closePanel}
                        className="px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Creating...' : 'Create Event'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {eventsOnSelectedDay.map((event) => {
                        const eventDate = new Date(event.date_time);
                        const isPast = eventDate < new Date();
                        return (
                          <div
                            key={event.id}
                            className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50/50"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Link
                                    href={`/admin/events/${event.id}`}
                                    className="font-bold text-indigo-600 hover:underline"
                                  >
                                    {event.title}
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFavorite(event.id)}
                                    className="p-1 hover:bg-yellow-50 rounded"
                                    title={
                                      favoriteIds.has(event.id)
                                        ? 'Remove from favorites'
                                        : 'Add to favorites'
                                    }
                                  >
                                    <svg
                                      className={`w-4 h-4 ${
                                        favoriteIds.has(event.id)
                                          ? 'text-yellow-500 fill-current'
                                          : 'text-gray-400'
                                      }`}
                                      fill={favoriteIds.has(event.id) ? 'currentColor' : 'none'}
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                      />
                                    </svg>
                                  </button>
                                  {isPast && (
                                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-600">
                                      Past
                                    </span>
                                  )}
                                </div>
                                {event.description && (
                                  <p className="text-gray-600 text-sm mb-2">{event.description}</p>
                                )}
                                <p className="text-sm text-gray-500">
                                  {eventDate.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}{' '}
                                  · {event.event_type} · Max {event.max_capacity}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDelete(event.id)}
                                className="ml-2 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={startCreateOnSelectedDay}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700"
                    >
                      + Create event on this day
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
