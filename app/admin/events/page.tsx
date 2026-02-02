'use client';

import { useState, useEffect } from 'react';
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

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [eventType, setEventType] = useState<'fun_assessment_day' | 'dexa_scan' | 'touchpoints'>('fun_assessment_day');

  useEffect(() => {
    async function checkAuthAndLoad() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is admin
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
    const { data: { user } } = await supabase.auth.getUser();

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

  const handleToggleFavorite = async (eventId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const isFavorited = favoriteIds.has(eventId);

    if (isFavorited) {
      // Remove favorite
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
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    } else {
      // Add favorite
      const { error } = await supabase
        .from('admin_event_favorites')
        .insert({
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

    if (!eventName.trim() || !eventDate || !eventTime || !maxParticipants) {
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

    // Combine date and time
    const dateTime = new Date(`${eventDate}T${eventTime}`);
    if (isNaN(dateTime.getTime())) {
      setError('Invalid date or time');
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from('events')
      .insert({
        title: eventName.trim(),
        description: eventDescription.trim() || null,
        date_time: dateTime.toISOString(),
        max_capacity: maxParticipantsNum,
        duration: 60, // Default duration of 60 minutes
        event_type: eventType,
        location: null,
        instructor_name: null,
      });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Reset form
    setEventName('');
    setEventDate('');
    setEventTime('');
    setEventDescription('');
    setMaxParticipants('');
    setEventType('fun_assessment_day');
    setShowForm(false);

    // Reload events and favorites
    await loadEvents();
    await loadFavorites();
    setSubmitting(false);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/admin"
            className="text-indigo-600 hover:text-indigo-700 mb-4 inline-flex items-center gap-2 font-semibold transition-colors"
          >
            <span>←</span> Back to Admin Dashboard
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-5xl font-extrabold text-gray-900 mb-3">
                Manage <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Events</span>
              </h1>
              <p className="text-lg text-gray-600">Create and manage workout events</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transform hover:-translate-y-0.5"
            >
              {showForm ? 'Cancel' : '+ Create Event'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        {/* Create Event Form */}
        {showForm && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-indigo-600">Create New Event</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="eventName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="eventName"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="e.g., Morning Cardio Session"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="eventDate" className="block text-sm font-semibold text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="eventDate"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  placeholder="Describe the event, what participants can expect..."
                />
              </div>

              <div>
                <label htmlFor="eventType" className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="eventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
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
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="e.g., 20"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Event'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEventName('');
                    setEventDate('');
                    setEventTime('');
                    setEventDescription('');
                    setMaxParticipants('');
                    setEventType('fun_assessment_day');
                    setError(null);
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Events List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-indigo-600">All Events</h2>
          {events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event) => {
                const eventDate = new Date(event.date_time);
                const isPast = eventDate < new Date();

                return (
                  <div
                    key={event.id}
                    className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0 hover:bg-gray-50/50 -mx-2 px-4 py-3 rounded-xl transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Link
                            href={`/admin/events/${event.id}`}
                            className="font-bold text-lg text-indigo-600 hover:underline"
                          >
                            {event.title}
                          </Link>
                          <button
                            onClick={() => handleToggleFavorite(event.id)}
                            className="p-1 hover:bg-yellow-50 rounded transition-colors"
                            title={favoriteIds.has(event.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <svg
                              className={`w-5 h-5 transition-colors ${
                                favoriteIds.has(event.id)
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-gray-400 hover:text-yellow-500'
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
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-600">
                              Past
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-gray-600 mb-3">{event.description}</p>
                        )}
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Date:</span>{' '}
                            {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString()}
                          </p>
                          <p>
                            <span className="font-medium">Max Participants:</span> {event.max_capacity}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="ml-4 px-4 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all duration-300 text-sm font-semibold border border-red-200 hover:border-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No events created yet. Click &quot;Create Event&quot; to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
}
