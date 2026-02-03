import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile, isAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import AnalyticsCharts from './AnalyticsCharts';

export default async function AdminAnalyticsPage() {
  const { user, error } = await getUserProfile();

  if (error || !user) {
    redirect('/login');
  }

  const admin = await isAdmin();
  if (!admin) {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  // Get all users
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, name, created_at')
    .order('created_at', { ascending: false });

  // Get admin IDs
  const { data: adminUsers } = await supabase
    .from('admin_users')
    .select('user_id');

  const adminIds = new Set(adminUsers?.map(a => a.user_id) || []);

  // Filter out admins to get participants
  const participants = allUsers?.filter(user => !adminIds.has(user.id)) || [];
  const totalParticipants = participants.length;

  // Get registration stats (last 30 days, last 7 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const newUsers30Days = participants.filter(
    p => new Date(p.created_at) >= thirtyDaysAgo
  ).length;
  const newUsers7Days = participants.filter(
    p => new Date(p.created_at) >= sevenDaysAgo
  ).length;

  // Get all bookings with events
  const participantIds = participants.map(p => p.id);
  
  const { data: allBookings } = participantIds.length > 0
    ? await supabase
        .from('bookings')
        .select(`
          user_id,
          event_id,
          events (
            id,
            event_type,
            date_time
          )
        `)
        .eq('status', 'confirmed')
        .in('user_id', participantIds)
    : { data: [] };

  // Get all attendance data
  const { data: allAttendanceData } = participantIds.length > 0
    ? await supabase
        .from('event_participant_data')
        .select('event_id, user_id, attendance')
        .eq('attendance', true)
        .in('user_id', participantIds)
    : { data: [] };

  // Get event participant data for averages (Fun/Assessment Day)
  const { data: funAssessmentData } = participantIds.length > 0
    ? await supabase
        .from('event_participant_data')
        .select(`
          attendance,
          grip_strength,
          chair_stand_30s,
          single_leg_stand,
          up_down_step_count,
          inbody,
          events!inner (
            event_type
          )
        `)
        .eq('events.event_type', 'fun_assessment_day')
        .in('user_id', participantIds)
    : { data: [] };

  // Create attendance map
  const attendanceByUser = new Map<string, Map<string, { dateTime: Date; eventType: string }>>();
  
  (allBookings || []).forEach((booking: any) => {
    const userId = booking.user_id;
    const event = booking.events;
    if (!event) return;

    const hasAttendance = (allAttendanceData || []).some(
      (ad: any) => ad.user_id === userId && ad.event_id === event.id && ad.attendance === true
    );

    if (hasAttendance) {
      if (!attendanceByUser.has(userId)) {
        attendanceByUser.set(userId, new Map());
      }
      const userEvents = attendanceByUser.get(userId)!;
      userEvents.set(event.id, {
        dateTime: new Date(event.date_time),
        eventType: event.event_type,
      });
    }
  });

  // Calculate participation statistics
  let initialFunCount = 0;
  let firstDexaCount = 0;
  const touchpointCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  let reinforcementFunCount = 0;
  let threeMonthFunCount = 0;
  let activeUsers = 0;

  participants.forEach(participant => {
    const userEvents = attendanceByUser.get(participant.id) || new Map();
    const events = Array.from(userEvents.values()).sort((a, b) => 
      a.dateTime.getTime() - b.dateTime.getTime()
    );

    if (events.length > 0) {
      activeUsers++;
    }

    // Initial FUN/Assessment Day
    const initialFun = events.find(e => e.eventType === 'fun_assessment_day');
    if (initialFun) {
      initialFunCount++;
      const initialFunDate = initialFun.dateTime;

      // First DEXA Scan
      const firstDexa = events.find(e => e.eventType === 'dexa_scan');
      if (firstDexa) {
        firstDexaCount++;
        const firstDexaDate = firstDexa.dateTime;

        // Touchpoints (after DEXA scan)
        const touchpointEvents = events
          .filter(e => e.eventType === 'touchpoints' && e.dateTime >= firstDexaDate)
          .slice(0, 9);
        
        touchpointEvents.forEach((tp, index) => {
          if (index < 9) {
            touchpointCounts[index]++;
          }
        });

        // Reinforcement FUN/Assessment Day
        const reinforcementFun = events.find(
          e => e.eventType === 'fun_assessment_day' 
            && e.dateTime >= firstDexaDate
            && e.dateTime !== initialFunDate
        );
        if (reinforcementFun) {
          reinforcementFunCount++;
        }
      }

      // 3 Month FUN/Assessment Day
      const threeMonthsLater = new Date(initialFunDate);
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      
      const threeMonthEvent = events.find(
        e => e.eventType === 'fun_assessment_day' 
          && e.dateTime >= threeMonthsLater
      );
      if (threeMonthEvent) {
        threeMonthFunCount++;
      }
    }
  });

  // Calculate averages from Fun/Assessment Day data
  const funDataWithAttendance = (funAssessmentData || []).filter(
    (d: any) => d.attendance === true
  );

  const attendanceRate = totalParticipants > 0 
    ? (initialFunCount / totalParticipants) * 100 
    : 0;

  const gripStrengths = funDataWithAttendance
    .map((d: any) => d.grip_strength)
    .filter((g: any) => g !== null && g !== undefined);
  const avgGripStrength = gripStrengths.length > 0
    ? gripStrengths.reduce((a: number, b: number) => a + b, 0) / gripStrengths.length
    : 0;

  const chairStands = funDataWithAttendance
    .map((d: any) => d.chair_stand_30s)
    .filter((c: any) => c !== null && c !== undefined);
  const avgChairStand = chairStands.length > 0
    ? chairStands.reduce((a: number, b: number) => a + b, 0) / chairStands.length
    : 0;

  const singleLegStands = funDataWithAttendance
    .map((d: any) => d.single_leg_stand)
    .filter((s: any) => s !== null && s !== undefined);
  const avgSingleLegStand = singleLegStands.length > 0
    ? singleLegStands.reduce((a: number, b: number) => a + b, 0) / singleLegStands.length
    : 0;

  const inbodyCount = funDataWithAttendance.filter((d: any) => d.inbody === true).length;
  const inbodyRate = funDataWithAttendance.length > 0
    ? (inbodyCount / funDataWithAttendance.length) * 100
    : 0;

  const inactiveUsers = totalParticipants - activeUsers;

  // Prepare chart data
  const participationData = [
    { name: 'Initial Fun/Assessment Day', completed: initialFunCount, total: totalParticipants },
    { name: 'First DEXA Scan', completed: firstDexaCount, total: totalParticipants },
    { name: 'Touchpoint 1', completed: touchpointCounts[0], total: totalParticipants },
    { name: 'Touchpoint 2', completed: touchpointCounts[1], total: totalParticipants },
    { name: 'Touchpoint 3', completed: touchpointCounts[2], total: totalParticipants },
    { name: 'Touchpoint 4', completed: touchpointCounts[3], total: totalParticipants },
    { name: 'Touchpoint 5', completed: touchpointCounts[4], total: totalParticipants },
    { name: 'Touchpoint 6', completed: touchpointCounts[5], total: totalParticipants },
    { name: 'Touchpoint 7', completed: touchpointCounts[6], total: totalParticipants },
    { name: 'Touchpoint 8', completed: touchpointCounts[7], total: totalParticipants },
    { name: 'Touchpoint 9', completed: touchpointCounts[8], total: totalParticipants },
    { name: 'Reinforcement Fun/Assessment Day', completed: reinforcementFunCount, total: totalParticipants },
    { name: '3 Month Fun/Assessment Day', completed: threeMonthFunCount, total: totalParticipants },
  ];

  const touchpointData = touchpointCounts.map((count, index) => ({
    name: `TP ${index + 1}`,
    completed: count,
    total: totalParticipants,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="mb-4 text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-2 inline-block"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-lg text-gray-600">Comprehensive overview of project metrics and participant progress</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Participants</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{totalParticipants}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active Users</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">{activeUsers}</p>
            <p className="text-xs text-gray-500 mt-1">{inactiveUsers} inactive</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">New Users (30d)</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">{newUsers30Days}</p>
            <p className="text-xs text-gray-500 mt-1">{newUsers7Days} in last 7 days</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Attendance Rate</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">{attendanceRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">{initialFunCount} of {totalParticipants} completed</p>
          </div>
        </div>

        {/* Charts Section */}
        <AnalyticsCharts 
          participationData={participationData}
          touchpointData={touchpointData}
          avgGripStrength={avgGripStrength}
          avgChairStand={avgChairStand}
          avgSingleLegStand={avgSingleLegStand}
          inbodyRate={inbodyRate}
          activeUsers={activeUsers}
          totalParticipants={totalParticipants}
        />
      </div>
    </div>
  );
}
