import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile, isAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import AdminFavouritesPanel from '@/components/AdminFavouritesPanel';
import { ThemeToggle } from '@/components/ThemeToggle';

export default async function AdminDashboardPage() {
  const { user, error } = await getUserProfile();

  if (error || !user) {
    redirect('/login');
  }

  // Check if user is admin
  const admin = await isAdmin();
  if (!admin) {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  // Get statistics
  // Count all users (participants are users who aren't admins)
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  // Get admin count
  const { count: adminCount } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true });
  
  const totalParticipants = (totalUsers || 0) - (adminCount || 0);

  const { count: totalEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });

  const { count: totalBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'confirmed');

  // Get recent events
  const { data: recentEvents } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  // Get recent participants (users who aren't admins)
  // Get all users first, then filter out admins in code
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, name, email, created_at')
    .order('created_at', { ascending: false })
    .limit(20); // Get more to account for filtering
  
  // Get admin IDs
  const { data: adminUsers } = await supabase
    .from('admin_users')
    .select('user_id');
  
  const adminIds = new Set(adminUsers?.map(a => a.user_id) || []);
  
  // Filter out admins and limit to 5
  const limitedParticipants = allUsers
    ?.filter(user => !adminIds.has(user.id))
    .slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 animate-fade-in flex justify-between items-start">
          <div>
            <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-3">
              Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Dashboard</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">Manage events, participants, and view analytics</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Quick Actions - Grid Icon Format */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Link
            href="/admin/events"
            className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 border border-gray-100 hover:border-indigo-200 transform hover:-translate-y-1 flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-indigo-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Manage Events</h3>
          </Link>
          <Link
            href="/admin/participants"
            className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 border border-gray-100 hover:border-indigo-200 transform hover:-translate-y-1 flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Participants</h3>
          </Link>
          <Link
            href="/admin/analytics"
            className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 border border-gray-100 hover:border-indigo-200 transform hover:-translate-y-1 flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Analytics</h3>
          </Link>
        </div>

        {/* Favourites Panel */}
        <AdminFavouritesPanel />

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100 hover:shadow-soft-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Participants</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{totalParticipants || 0}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100 hover:shadow-soft-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Events</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{totalEvents || 0}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100 hover:shadow-soft-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active Bookings</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{totalBookings || 0}</p>
          </div>
        </div>


        {/* Recent Events */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 mb-8 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-indigo-600">Recent Events</h2>
            <Link
              href="/admin/events"
              className="text-indigo-600 hover:underline text-sm"
            >
              View All →
            </Link>
          </div>
          {recentEvents && recentEvents.length > 0 ? (
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div key={event.id} className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0 hover:bg-gray-50/50 -mx-2 px-3 py-2 rounded-lg transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-indigo-600 mb-1">{event.title}</h3>
                      <p className="text-gray-600">
                        {new Date(event.date_time).toLocaleDateString()} at{' '}
                        {new Date(event.date_time).toLocaleTimeString()}
                      </p>
                      <p className="text-sm text-gray-500">{event.event_type} • {event.location || 'TBA'}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-indigo-100 text-indigo-800">
                      {event.event_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No events created yet.</p>
          )}
        </div>

        {/* Recent Participants */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-indigo-600">Recent Participants</h2>
            <Link
              href="/admin/participants"
              className="text-indigo-600 hover:underline text-sm"
            >
              View All →
            </Link>
          </div>
          {limitedParticipants && limitedParticipants.length > 0 ? (
            <div className="space-y-4">
              {limitedParticipants.map((participant) => (
                <div key={participant.id} className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0 hover:bg-gray-50/50 -mx-2 px-3 py-2 rounded-lg transition-colors">
                  <h3 className="font-bold text-lg text-indigo-600 mb-1">{participant.name}</h3>
                  <p className="text-gray-600">{participant.email}</p>
                  <p className="text-sm text-gray-500">
                    Joined {new Date(participant.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No participants yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
