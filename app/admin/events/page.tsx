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

function getEventTypeColor(eventType: string): string {
  switch (eventType) {
    case 'fun_assessment_day':
      return 'bg-blue-500';
    case 'dexa_scan':
      return 'bg-purple-500';
    case 'touchpoints':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
}

function getEventTypesOnDate(events: Event[], dateKey: string): Set<string> {
  return new Set(getEventsOnDate(events, dateKey).map(e => e.event_type));
}

interface DexaTimeSlot {
  scanner: 1 | 2;
  hour: number;
  minute: number;
  duration: number;
}

interface DexaTimeTableProps {
  date: string;
  timeSlots: DexaTimeSlot[];
  setTimeSlots: (slots: DexaTimeSlot[]) => void;
  blockDuration: number;
  setBlockDuration: (duration: number) => void;
}

function DexaTimeTable({ date, timeSlots, setTimeSlots, blockDuration, setBlockDuration }: DexaTimeTableProps) {
  const [hoveredSlot, setHoveredSlot] = useState<{scanner: 1 | 2; timeSlotIndex: number} | null>(null);

  // Generate all 10-minute time slots from 9:00am to 6:50pm (60 slots: 9:00, 9:10, ..., 18:50)
  // 9am = 9*60 = 540 minutes, 7pm = 19*60 = 1140 minutes
  // From 540 to 1140, in 10-minute intervals = 60 slots
  const timeSlotsList = Array.from({ length: 60 }, (_, i) => {
    const totalMinutes = 540 + i * 10; // Start at 9am (540 minutes)
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return { hour, minute, totalMinutes };
  });

  const handleCellHover = (scanner: 1 | 2, timeSlotIndex: number) => {
    setHoveredSlot({ scanner, timeSlotIndex });
  };

  const handleCellClick = (scanner: 1 | 2, timeSlotIndex: number) => {
    const timeSlot = timeSlotsList[timeSlotIndex];
    if (!timeSlot) return;

    const existingIndex = timeSlots.findIndex(
      (s) => s.scanner === scanner && s.hour === timeSlot.hour && s.minute === timeSlot.minute
    );

    if (existingIndex >= 0) {
      // Remove slot
      setTimeSlots(timeSlots.filter((_, i) => i !== existingIndex));
    } else {
      // Add slot
      setTimeSlots([...timeSlots, { scanner, hour: timeSlot.hour, minute: timeSlot.minute, duration: blockDuration }]);
    }
  };

  const isSlotSelected = (scanner: 1 | 2, hour: number, minute: number): boolean => {
    return timeSlots.some(
      (s) => s.scanner === scanner && s.hour === hour && s.minute === minute
    );
  };

  const getSlotEndTime = (slot: DexaTimeSlot): { hour: number; minute: number } => {
    let endMinute = slot.minute + slot.duration;
    let endHour = slot.hour;
    while (endMinute >= 60) {
      endMinute -= 60;
      endHour += 1;
    }
    return { hour: endHour, minute: endMinute };
  };

  const isTimeInSlot = (scanner: 1 | 2, timeSlotIndex: number): boolean => {
    const timeSlot = timeSlotsList[timeSlotIndex];
    if (!timeSlot) return false;
    
    return timeSlots.some((slot) => {
      if (slot.scanner !== scanner) return false;
      const end = getSlotEndTime(slot);
      const slotStart = slot.hour * 60 + slot.minute;
      const slotEnd = end.hour * 60 + end.minute;
      const checkTime = timeSlot.totalMinutes;
      return checkTime >= slotStart && checkTime < slotEnd;
    });
  };

  const isInHoveredBlock = (scanner: 1 | 2, timeSlotIndex: number): boolean => {
    if (!hoveredSlot || hoveredSlot.scanner !== scanner) return false;
    
    const hoveredTimeSlot = timeSlotsList[hoveredSlot.timeSlotIndex];
    if (!hoveredTimeSlot) return false;
    
    const hoverStart = hoveredTimeSlot.totalMinutes;
    const hoverEnd = hoverStart + blockDuration;
    const checkTime = timeSlotsList[timeSlotIndex]?.totalMinutes;
    
    return checkTime !== undefined && checkTime >= hoverStart && checkTime < hoverEnd;
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="blockDuration" className="block text-sm font-semibold text-gray-700 mb-2">
          Time Block Duration (minutes)
        </label>
        <input
          type="number"
          id="blockDuration"
          value={blockDuration}
          onChange={(e) => {
            const newDuration = parseInt(e.target.value, 10);
            if (!isNaN(newDuration) && newDuration > 0) {
              setBlockDuration(newDuration);
              // Update existing slots with new duration
              setTimeSlots(timeSlots.map(slot => ({ ...slot, duration: newDuration })));
            }
          }}
          min="10"
          step="10"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
        />
      </div>

      <div className="border border-gray-300 rounded-xl overflow-hidden">
        <div className="bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Select Time Slots (9am - 7pm)</h3>
          <p className="text-xs text-gray-500">Hover to preview, click to add/remove time slots</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200 sticky left-0 z-10">
                  Scanner
                </th>
                {timeSlotsList.map((timeSlot, idx) => {
                  // Show hour labels only at the start of each hour (every 6th slot: 0, 6, 12, ...)
                  const showLabel = timeSlot.minute === 0;
                  return (
                    <th
                      key={idx}
                      className={`p-2 text-xs font-semibold text-gray-600 bg-gray-50 border-b border-r border-gray-200 min-w-[40px] ${
                        showLabel ? 'border-l-2 border-gray-400' : ''
                      }`}
                    >
                      {showLabel ? (
                        <div className="text-center">
                          <div>{timeSlot.hour === 12 ? '12' : timeSlot.hour < 12 ? timeSlot.hour : timeSlot.hour - 12}</div>
                          <div className="text-[10px] text-gray-500">{timeSlot.hour < 12 ? 'am' : 'pm'}</div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-gray-400 text-center">
                          {String(timeSlot.minute).padStart(2, '0')}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {[1, 2].map((scanner) => (
                <tr key={scanner}>
                  <td className="p-3 text-sm font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 sticky left-0 z-10">
                    Scanner {scanner}
                  </td>
                  {timeSlotsList.map((timeSlot, idx) => {
                    const isSelected = isSlotSelected(scanner as 1 | 2, timeSlot.hour, timeSlot.minute);
                    const isInSlot = isTimeInSlot(scanner as 1 | 2, idx);
                    const isInHovered = isInHoveredBlock(scanner as 1 | 2, idx);
                    
                    const endTime = (() => {
                      const endMinutes = timeSlot.totalMinutes + blockDuration;
                      const endHour = Math.floor(endMinutes / 60);
                      const endMin = endMinutes % 60;
                      return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
                    })();

                    return (
                      <td
                        key={idx}
                        className={`p-1 border-r border-gray-200 cursor-pointer transition-all ${
                          isSelected || isInSlot
                            ? 'bg-indigo-500 hover:bg-indigo-600'
                            : isInHovered
                            ? 'bg-indigo-200/50 hover:bg-indigo-300/50'
                            : 'hover:bg-indigo-50'
                        }`}
                        style={{ minWidth: '40px' }}
                        onMouseEnter={() => handleCellHover(scanner as 1 | 2, idx)}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => handleCellClick(scanner as 1 | 2, idx)}
                        title={`${String(timeSlot.hour).padStart(2, '0')}:${String(timeSlot.minute).padStart(2, '0')} - ${endTime} (${blockDuration} min)`}
                      >
                        <div className="h-8 w-full flex items-center justify-center">
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {timeSlots.length > 0 && (
        <div className="mt-4 p-4 bg-indigo-50 rounded-xl">
          <p className="text-sm font-semibold text-indigo-900 mb-2">
            Selected Time Slots ({timeSlots.length}):
          </p>
          <div className="space-y-1">
            {timeSlots
              .sort((a, b) => {
                if (a.scanner !== b.scanner) return a.scanner - b.scanner;
                if (a.hour !== b.hour) return a.hour - b.hour;
                return a.minute - b.minute;
              })
              .map((slot, idx) => {
                const end = getSlotEndTime(slot);
                return (
                  <div key={idx} className="text-xs text-indigo-700">
                    Scanner {slot.scanner}: {String(slot.hour).padStart(2, '0')}:
                    {String(slot.minute).padStart(2, '0')} - {String(end.hour).padStart(2, '0')}:
                    {String(end.minute).padStart(2, '0')} ({slot.duration} min)
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
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
  const [location, setLocation] = useState<'Location A' | 'Location B' | 'Location C'>('Location A');
  const [duration, setDuration] = useState('1.5'); // Default 1.5 hours for fun_assessment_day
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<RecurrenceFrequency>('weekly');
  
  // DEXA scan specific state
  const [dexaTimeSlots, setDexaTimeSlots] = useState<Array<{scanner: 1 | 2; hour: number; minute: number; duration: number}>>([]);
  const [dexaBlockDuration, setDexaBlockDuration] = useState(20); // Default 20 minutes

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
    setLocation('Location A');
    setDuration('1.5');
    setIsRecurring(false);
    setRecurrenceEndDate('');
    setRecurrenceFrequency('weekly');
    setDexaTimeSlots([]);
    setDexaBlockDuration(20);
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

    if (!eventName.trim() || !eventDate || !maxParticipants) {
      setError('Please fill in all required fields');
      setSubmitting(false);
      return;
    }

    // For DEXA scans, require at least one time slot
    if (eventType === 'dexa_scan' && dexaTimeSlots.length === 0) {
      setError('Please select at least one time slot for DEXA scan');
      setSubmitting(false);
      return;
    }

    // For non-DEXA events, require time input
    if (eventType !== 'dexa_scan' && !eventTime) {
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

    // Calculate duration in minutes
    let durationMinutes = 60; // Default
    if (eventType === 'fun_assessment_day') {
      const durationHours = parseFloat(duration);
      if (!isNaN(durationHours) && durationHours > 0) {
        durationMinutes = Math.round(durationHours * 60);
      }
    } else if (eventType === 'dexa_scan') {
      durationMinutes = dexaBlockDuration;
    }

    const supabase = createClient();

    if (eventType === 'dexa_scan') {
      // Handle DEXA scan: create multiple events from time slots
      for (const slot of dexaTimeSlots) {
        const slotDate = new Date(eventDate);
        slotDate.setHours(slot.hour, slot.minute, 0, 0);
        
        const { error: insertError } = await supabase.from('events').insert({
          title: `${eventName.trim()} - Scanner ${slot.scanner}`,
          description: eventDescription.trim() || null,
          date_time: slotDate.toISOString(),
          max_capacity: maxParticipantsNum,
          duration: slot.duration,
          event_type: eventType,
          location: location,
          instructor_name: null,
        });

        if (insertError) {
          setError(insertError.message);
          setSubmitting(false);
          return;
        }
      }
    } else {
      // Handle regular events (fun_assessment_day, touchpoints)
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

      for (const d of datesToCreate) {
        const { error: insertError } = await supabase.from('events').insert({
          title: eventName.trim(),
          description: eventDescription.trim() || null,
          date_time: d.toISOString(),
          max_capacity: maxParticipantsNum,
          duration: durationMinutes,
          event_type: eventType,
          location: location,
          instructor_name: null,
        });

        if (insertError) {
          setError(insertError.message);
          setSubmitting(false);
          return;
        }
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
              const eventTypes = getEventTypesOnDate(events, dateKey);
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => openPanel(dateKey)}
                  className={`aspect-square rounded-xl text-sm font-semibold transition-all relative ${
                    hasEvents
                      ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                  } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                >
                  {day}
                  {eventTypes.size > 0 && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                      {Array.from(eventTypes).map((eventType) => (
                        <div
                          key={eventType}
                          className={`w-1.5 h-1.5 rounded-full ${getEventTypeColor(eventType)}`}
                          title={eventType}
                        />
                      ))}
                    </div>
                  )}
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
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-6xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
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
                    
                    {/* Event Type - Moved to top */}
                    <div>
                      <label htmlFor="eventType" className="block text-sm font-semibold text-gray-700 mb-2">
                        Event Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="eventType"
                        value={eventType}
                        onChange={(e) => {
                          const newType = e.target.value as 'fun_assessment_day' | 'dexa_scan' | 'touchpoints';
                          setEventType(newType);
                          // Reset DEXA slots when switching away from DEXA
                          if (newType !== 'dexa_scan') {
                            setDexaTimeSlots([]);
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                        required
                      >
                        <option value="fun_assessment_day">FUN/Assessment Day</option>
                        <option value="dexa_scan">DEXA Scan</option>
                        <option value="touchpoints">Touchpoints</option>
                      </select>
                    </div>

                    {/* Location */}
                    <div>
                      <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                        Location <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value as 'Location A' | 'Location B' | 'Location C')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                        required
                      >
                        <option value="Location A">Location A</option>
                        <option value="Location B">Location B</option>
                        <option value="Location C">Location C</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="eventName" className="block text-sm font-semibold text-gray-700 mb-2">
                        Event Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="eventName"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                        placeholder="e.g., Morning Session"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="eventDate" className="block text-sm font-semibold text-gray-700 mb-2">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="eventDate"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                        required
                      />
                    </div>
                    
                    {/* Conditional time input or DEXA table */}
                    {eventType === 'dexa_scan' ? (
                      <DexaTimeTable
                        date={eventDate}
                        timeSlots={dexaTimeSlots}
                        setTimeSlots={setDexaTimeSlots}
                        blockDuration={dexaBlockDuration}
                        setBlockDuration={setDexaBlockDuration}
                      />
                    ) : (
                      <div>
                        <label htmlFor="eventTime" className="block text-sm font-semibold text-gray-700 mb-2">
                          Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          id="eventTime"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                          required
                        />
                      </div>
                    )}

                    {/* Duration field for fun_assessment_day */}
                    {eventType === 'fun_assessment_day' && (
                      <div>
                        <label htmlFor="duration" className="block text-sm font-semibold text-gray-700 mb-2">
                          Duration (hours) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id="duration"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          min="0.5"
                          step="0.5"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                          placeholder="1.5"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="eventDescription" className="block text-sm font-semibold text-gray-700 mb-2">
                        Event Description
                      </label>
                      <textarea
                        id="eventDescription"
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white text-gray-900"
                        placeholder="Describe the event..."
                      />
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                        placeholder="e.g., 20"
                        required
                      />
                    </div>

                    {/* Recurring events - only for non-DEXA events */}
                    {eventType !== 'dexa_scan' && (
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
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
                    )}

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
