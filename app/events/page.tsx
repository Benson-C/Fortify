import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import EventsCalendarView from '@/components/EventsCalendarView';

export default async function EventsPage() {
  const { user, error } = await getUserProfile();

  if (error || !user) {
    redirect('/login');
  }

  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfNextYear = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59);

  // Fetch events from start of current month to end of next year (for calendar + list)
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .gte('date_time', startOfMonth.toISOString())
    .lte('date_time', endOfNextYear.toISOString())
    .order('date_time', { ascending: true });

  // Get user's bookings to show which events they're already booked for
  const { data: userBookings } = await supabase
    .from('bookings')
    .select('event_id')
    .eq('user_id', user.id)
    .eq('status', 'confirmed');

  const bookedEventIds = userBookings?.map((b) => b.event_id) ?? [];

  // Get booking counts for each event
  const eventIds = events?.map((e) => e.id) ?? [];
  const { data: bookingCountsData } = await supabase
    .from('bookings')
    .select('event_id')
    .in('event_id', eventIds)
    .eq('status', 'confirmed');

  const bookingCounts: Record<string, number> = {};
  bookingCountsData?.forEach((b) => {
    bookingCounts[b.event_id] = (bookingCounts[b.event_id] ?? 0) + 1;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-5xl font-extrabold text-gray-900 mb-2">
              Workout Events
            </h1>
            <p className="text-lg text-gray-600">
              Book your next fitness session
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-white/80 backdrop-blur-sm text-indigo-600 rounded-xl font-semibold border-2 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            ← Dashboard
          </Link>
        </div>

        {eventsError ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
            Error loading events: {eventsError.message}
          </div>
        ) : (
          <EventsCalendarView
            events={events ?? []}
            bookedEventIds={bookedEventIds}
            bookingCounts={bookingCounts}
          />
        )}
      </div>
    </div>
  );
}
