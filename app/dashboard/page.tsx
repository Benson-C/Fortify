import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const { user, error } = await getUserProfile();

  if (error || !user) {
    redirect('/login');
  }

  // Redirect admins to admin dashboard
  const supabase = await createClient();
  const { data: adminCheck } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (adminCheck) {
    redirect('/admin');
  }

  // Get user's bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      booking_date,
      events (
        id,
        title,
        date_time,
        duration,
        event_type,
        location
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .order('booking_date', { ascending: false })
    .limit(5);

  // Get upcoming events
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('*')
    .gte('date_time', new Date().toISOString())
    .order('date_time', { ascending: true })
    .limit(5);

  // Get latest health metrics
  const { data: latestMetrics } = await supabase
    .from('health_metrics')
    .select('*')
    .eq('user_id', user.id)
    .order('recorded_date', { ascending: false })
    .limit(1)
    .single();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10 animate-fade-in">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-3">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{user.name}</span>!
          </h1>
          <p className="text-lg text-gray-600">Your health & fitness research dashboard</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <Link
            href="/events"
            className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 border border-gray-100 hover:border-indigo-200 transform hover:-translate-y-1"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-indigo-500/20">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-indigo-600 transition-colors">Browse Events</h3>
            <p className="text-gray-600 leading-relaxed">View and book workout sessions</p>
          </Link>
          <Link
            href="/dashboard/health"
            className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 border border-gray-100 hover:border-indigo-200 transform hover:-translate-y-1"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/20">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-indigo-600 transition-colors">Health Metrics</h3>
            <p className="text-gray-600 leading-relaxed">Track your health data</p>
          </Link>
          <Link
            href="/dashboard/bookings"
            className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 border border-gray-100 hover:border-indigo-200 transform hover:-translate-y-1"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/20">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-indigo-600 transition-colors">My Bookings</h3>
            <p className="text-gray-600 leading-relaxed">View and manage your scheduled sessions</p>
          </Link>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-indigo-600">Recent Bookings</h2>
          {bookings && bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking: any) => (
                <div key={booking.id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0 hover:bg-gray-50/50 -mx-2 px-3 py-2 rounded-lg transition-colors">
                  <h3 className="font-bold text-lg text-indigo-600 mb-1">{booking.events?.title}</h3>
                  <p className="text-gray-600">
                    {new Date(booking.events?.date_time).toLocaleDateString()} at{' '}
                    {new Date(booking.events?.date_time).toLocaleTimeString()}
                  </p>
                  <p className="text-sm text-gray-500">{booking.events?.event_type} • {booking.events?.location}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No bookings yet. <Link href="/events" className="text-indigo-600 hover:underline">Browse events</Link> to get started!</p>
          )}
        </div>

        {/* Latest Health Metrics */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-indigo-600">Latest Health Metrics</h2>
          {latestMetrics ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              {latestMetrics.grip_strength !== null && (
                <div>
                  <p className="text-sm text-gray-500">Grip Strength</p>
                  <p className="text-2xl font-semibold">{latestMetrics.grip_strength}</p>
                </div>
              )}
              {latestMetrics.bone_density !== null && (
                <div>
                  <p className="text-sm text-gray-500">Bone Density</p>
                  <p className="text-2xl font-semibold">{latestMetrics.bone_density}</p>
                </div>
              )}
              {latestMetrics.pushup_count !== null && (
                <div>
                  <p className="text-sm text-gray-500">Pushups</p>
                  <p className="text-2xl font-semibold">{latestMetrics.pushup_count}</p>
                </div>
              )}
              {latestMetrics.heart_rate !== null && (
                <div>
                  <p className="text-sm text-gray-500">Heart Rate</p>
                  <p className="text-2xl font-semibold">{latestMetrics.heart_rate} bpm</p>
                </div>
              )}
              {latestMetrics.body_fat !== null && (
                <div>
                  <p className="text-sm text-gray-500">Body Fat</p>
                  <p className="text-2xl font-semibold">{latestMetrics.body_fat}%</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">
              No health metrics recorded yet. <Link href="/dashboard/health" className="text-indigo-600 hover:underline">Add your first entry</Link>
            </p>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-indigo-600">Upcoming Events</h2>
          {upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingEvents.map((event: any) => (
                <div key={event.id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0 hover:bg-gray-50/50 -mx-2 px-3 py-2 rounded-lg transition-colors">
                  <h3 className="font-bold text-lg text-indigo-600 mb-1">{event.title}</h3>
                  <p className="text-gray-600">
                    {new Date(event.date_time).toLocaleDateString()} at{' '}
                    {new Date(event.date_time).toLocaleTimeString()}
                  </p>
                  <p className="text-sm text-gray-500">{event.event_type} • {event.location || 'TBA'}</p>
                  <Link
                    href={`/events#event-${event.id}`}
                    className="text-indigo-600 hover:underline text-sm mt-2 inline-block"
                  >
                    View Details →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No upcoming events scheduled.</p>
          )}
        </div>
      </div>
    </div>
  );
}
