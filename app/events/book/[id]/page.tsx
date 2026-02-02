'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Event {
  id: string;
  title: string;
  description: string | null;
  date_time: string;
  duration: number;
  max_capacity: number;
  event_type: string;
  location: string | null;
  instructor_name: string | null;
}

export default function BookEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [bookingCount, setBookingCount] = useState(0);
  const [isBooked, setIsBooked] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      const supabase = createClient();
      
      // Get event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        setError('Event not found');
        setLoading(false);
        return;
      }

      setEvent(eventData as Event);

      // Get booking count
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'confirmed');

      setBookingCount(count || 0);

      // Check if user is already booked
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingBooking } = await supabase
          .from('bookings')
          .select('id')
          .eq('user_id', user.id)
          .eq('event_id', eventId)
          .eq('status', 'confirmed')
          .maybeSingle();

        setIsBooked(!!existingBooking);
        setBookingId(existingBooking?.id ?? null);
      }

      setLoading(false);
    }

    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const handleBook = async () => {
    setBooking(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Not authenticated');
      setBooking(false);
      return;
    }

    // Check if already booked
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (existing) {
      setError('You are already booked for this event');
      setBooking(false);
      return;
    }

    // Check capacity
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'confirmed');

    if ((count || 0) >= (event?.max_capacity || 0)) {
      setError('Event is fully booked');
      setBooking(false);
      return;
    }

    // Create booking
    const { error: insertError } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        event_id: eventId,
        status: 'confirmed',
      });

    if (insertError) {
      setError(insertError.message);
      setBooking(false);
      return;
    }

    // Success - redirect to bookings page
    router.push('/dashboard/bookings');
    router.refresh();
  };

  const handleCancel = async () => {
    if (!bookingId) return;
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setCancelling(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Not authenticated');
      setCancelling(false);
      return;
    }

    // Re-check 24-hour policy using authoritative event date
    const { data: bookingRow } = await supabase
      .from('bookings')
      .select(
        `
        id,
        status,
        events (
          date_time
        )
      `
      )
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .single();

    if (!bookingRow) {
      setError('Booking not found');
      setCancelling(false);
      return;
    }

    const eventDate = new Date((bookingRow.events as any)?.date_time);
    const hoursUntilEvent = (eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (hoursUntilEvent < 24) {
      setError('Cancellations must be made at least 24 hours before the event');
      setCancelling(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('user_id', user.id);

    if (updateError) {
      setError(updateError.message);
      setCancelling(false);
      return;
    }

    setIsBooked(false);
    setBookingId(null);
    setCancelling(false);
    router.push('/dashboard/bookings');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/events"
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-block"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const spotsRemaining = event.max_capacity - bookingCount;
  const isFull = spotsRemaining <= 0;
  const eventDate = new Date(event.date_time);
  const isPastEvent = eventDate < new Date();
  const hoursUntilEvent = (eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
  const canCancel = hoursUntilEvent >= 24;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/events"
            className="text-indigo-600 hover:text-indigo-700 mb-6 inline-flex items-center gap-2 font-semibold transition-colors"
          >
            <span>←</span> Back to Events
          </Link>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft-lg p-8 border border-gray-100 animate-scale-in">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-extrabold text-gray-900 mb-3">{event.title}</h1>
                <span className="px-4 py-1.5 text-sm font-bold rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200">
                  {event.event_type}
                </span>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg animate-slide-up">
                <p className="font-medium">{error}</p>
              </div>
            )}

            {event.description && (
              <p className="text-gray-700 mb-6">{event.description}</p>
            )}

            <div className="space-y-4 mb-6">
              <div className="flex items-center">
                <span className="font-semibold text-gray-700 w-32">Date:</span>
                <span className="text-gray-600">{eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold text-gray-700 w-32">Time:</span>
                <span className="text-gray-600">{eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold text-gray-700 w-32">Duration:</span>
                <span className="text-gray-600">{event.duration} minutes</span>
              </div>
              {event.location && (
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-32">Location:</span>
                  <span className="text-gray-600">{event.location}</span>
                </div>
              )}
              {event.instructor_name && (
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-32">Instructor:</span>
                  <span className="text-gray-600">{event.instructor_name}</span>
                </div>
              )}
              <div className="flex items-center">
                <span className="font-semibold text-gray-700 w-32">Capacity:</span>
                <span className="text-gray-600">
                  {bookingCount}/{event.max_capacity} spots filled ({spotsRemaining} remaining)
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-8">
              {isPastEvent ? (
                <div className="bg-gray-50 text-gray-600 px-6 py-4 rounded-xl text-center font-semibold border border-gray-200">
                  This event has already passed
                </div>
              ) : isBooked ? (
                <>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-6 py-4 rounded-xl text-center font-semibold border border-green-200 mb-4">
                    ✓ You&apos;re booked for this event
                  </div>
                  {canCancel ? (
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="w-full bg-red-50 text-red-700 px-6 py-4 rounded-xl hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold text-lg border border-red-200 hover:border-red-300 shadow-sm hover:shadow-md"
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel appointment'}
                    </button>
                  ) : (
                    <div className="bg-gray-50 text-gray-600 px-6 py-4 rounded-xl text-center font-semibold border border-gray-200">
                      Cancellation unavailable (&lt; 24h before event)
                    </div>
                  )}
                </>
              ) : isFull ? (
                <div className="bg-gray-50 text-gray-600 px-6 py-4 rounded-xl text-center font-semibold border border-gray-200 mb-4">
                  This event is fully booked
                </div>
              ) : (
                <button
                  onClick={handleBook}
                  disabled={booking}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  {booking ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Booking...
                    </span>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              )}

              <Link
                href="/dashboard/bookings"
                className="block text-center text-indigo-600 hover:text-indigo-700 mt-4"
              >
                View My Bookings →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
