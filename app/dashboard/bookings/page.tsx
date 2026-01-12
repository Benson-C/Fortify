'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Booking } from '@/lib/api/types';

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
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Load user's bookings
      const { data: bookingsData, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          events (
            id,
            title,
            date_time,
            duration,
            event_type,
            location,
            instructor_name
          )
        `)
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setBookings((bookingsData || []) as Booking[]);

      // Load upcoming events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true });

      if (eventsError) {
        setError(eventsError.message);
        setLoading(false);
        return;
      }

      setEvents(eventsData || []);

      // Get booking counts for all events
      const eventIds = eventsData?.map(e => e.id) || [];
      if (eventIds.length > 0) {
        const { data: bookingCountsData } = await supabase
          .from('bookings')
          .select('event_id')
          .in('event_id', eventIds)
          .eq('status', 'confirmed');

        const countsMap = new Map<string, number>();
        bookingCountsData?.forEach((booking) => {
          const current = countsMap.get(booking.event_id) || 0;
          countsMap.set(booking.event_id, current + 1);
        });
        setBookingCounts(countsMap);
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setCancellingId(bookingId);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Not authenticated');
      setCancellingId(null);
      return;
    }

    // Get booking with event details to check 24-hour policy
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        events (
          date_time
        )
      `)
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .single();

    if (!booking) {
      setError('Booking not found');
      setCancellingId(null);
      return;
    }

    const eventDate = new Date((booking.events as any).date_time);
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check 24-hour cancellation policy
    if (hoursUntilEvent < 24) {
      setError('Cancellations must be made at least 24 hours before the event');
      setCancellingId(null);
      return;
    }

    // Cancel booking
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('user_id', user.id);

    if (updateError) {
      setError(updateError.message);
      setCancellingId(null);
      return;
    }

    // Remove cancelled booking from list
    setBookings(bookings.filter(b => b.id !== bookingId));
    setCancellingId(null);
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  const upcomingBookings = bookings.filter(b => {
    if (b.status !== 'confirmed') return false;
    const eventDate = new Date((b.events as any)?.date_time || b.booking_date);
    return eventDate >= new Date();
  });

  const pastBookings = bookings.filter(b => {
    if (b.status !== 'confirmed') return false;
    const eventDate = new Date((b.events as any)?.date_time || b.booking_date);
    return eventDate < new Date();
  });

  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  // Get booked event IDs to filter them out from available events
  const bookedEventIds = new Set(
    bookings
      .filter(b => b.status === 'confirmed')
      .map(b => (b.events as any)?.id)
      .filter(Boolean)
  );

  // Filter events to only show ones user hasn't booked
  const availableEvents = events.filter(e => !bookedEventIds.has(e.id));

  // Function to get border color based on availability
  const getBorderColor = (event: Event) => {
    const count = bookingCounts.get(event.id) || 0;
    const spotsRemaining = event.max_capacity - count;
    const availabilityPercent = (spotsRemaining / event.max_capacity) * 100;

    if (availabilityPercent > 50) {
      return 'border-green-400'; // Green: plenty of spots
    } else if (availabilityPercent > 25) {
      return 'border-yellow-400'; // Yellow: getting full
    } else {
      return 'border-red-400'; // Red: almost full or full
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-10">
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-700 mb-4 inline-flex items-center gap-2 font-semibold transition-colors"
          >
            <span>←</span> Back to Dashboard
          </Link>
          <h1 className="text-5xl font-extrabold text-gray-900 mb-3">My Bookings</h1>
          <p className="text-lg text-gray-600">Manage your workout session bookings</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Available Events for Booking */}
        {availableEvents.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-indigo-600">Available Events</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableEvents.map((event) => {
                const bookingCount = bookingCounts.get(event.id) || 0;
                const spotsRemaining = event.max_capacity - bookingCount;
                const eventDate = new Date(event.date_time);
                const borderColor = getBorderColor(event);

                return (
                  <div
                    key={event.id}
                    className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 hover:shadow-soft-lg transition-all duration-300 border-2 ${borderColor} hover:border-opacity-80 transform hover:-translate-y-1`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-indigo-600 pr-2">{event.title}</h3>
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200">
                        {event.event_type}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-2">Date:</span>
                        <span>{eventDate.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-2">Time:</span>
                        <span>{eventDate.toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-2">Capacity:</span>
                        <span>
                          {bookingCount}/{event.max_capacity} spots filled
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/events/book/${event.id}`}
                      className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-xl text-center hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transform hover:-translate-y-0.5"
                    >
                      Book Now
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Bookings */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-indigo-600">Upcoming Bookings</h2>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => {
                const event = booking.events as any;
                const eventDate = new Date(event?.date_time || booking.booking_date);
                const hoursUntilEvent = (eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
                const canCancel = hoursUntilEvent >= 24;

                return (
                  <div key={booking.id} className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0 hover:bg-gray-50/50 -mx-2 px-4 py-3 rounded-xl transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-indigo-600 mb-2">{event?.title || 'Event'}</h3>
                        <p className="text-gray-600">
                          {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString()}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {event?.event_type} • {event?.location || 'TBA'}
                        </p>
                        {event?.instructor_name && (
                          <p className="text-sm text-gray-500">Instructor: {event.instructor_name}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          Duration: {event?.duration || 'N/A'} minutes
                        </p>
                      </div>
                      <div className="ml-4">
                        {canCancel ? (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            disabled={cancellingId === booking.id}
                            className="px-5 py-2.5 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all duration-300 disabled:opacity-50 text-sm font-semibold border border-red-200 hover:border-red-300 shadow-sm hover:shadow-md"
                          >
                            {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        ) : (
                          <div className="px-5 py-2.5 bg-gray-50 text-gray-500 rounded-xl text-sm text-center border border-gray-200 font-medium">
                            Cannot cancel<br />(&lt; 24h)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No upcoming bookings. <Link href="/events" className="text-indigo-600 hover:underline">Browse events</Link> to book a session!</p>
          )}
        </div>

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-indigo-600">Past Bookings</h2>
            <div className="space-y-4">
              {pastBookings.map((booking) => {
                const event = booking.events as any;
                const eventDate = new Date(event?.date_time || booking.booking_date);

                return (
                  <div key={booking.id} className="border-b pb-4 last:border-b-0 opacity-75">
                    <h3 className="font-semibold text-lg text-indigo-600 mb-1">{event?.title || 'Event'}</h3>
                    <p className="text-gray-600">
                      {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {event?.event_type} • {event?.location || 'TBA'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelled Bookings */}
        {cancelledBookings.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-indigo-600">Cancelled Bookings</h2>
            <div className="space-y-4">
              {cancelledBookings.map((booking) => {
                const event = booking.events as any;
                const eventDate = new Date(event?.date_time || booking.booking_date);

                return (
                  <div key={booking.id} className="border-b pb-4 last:border-b-0 opacity-60">
                    <h3 className="font-semibold text-lg text-gray-500 mb-1 line-through">{event?.title || 'Event'}</h3>
                    <p className="text-gray-500">
                      {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {event?.event_type} • Cancelled
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
