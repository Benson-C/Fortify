import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile, isAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

interface ParticipantData {
  id: string;
  name: string;
  phone_number: string | null;
  group: string;
  initialFunAssessment: string | null;
  firstDexaScan: string | null;
  touchpoints: (string | null)[];
  reinforcementFunAssessment: string | null;
  threeMonthFunAssessment: string | null;
}

export default async function AdminParticipantsPage() {
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
    .select('id, name, phone_number')
    .order('name', { ascending: true });

  // Get admin IDs
  const { data: adminUsers } = await supabase
    .from('admin_users')
    .select('user_id');

  const adminIds = new Set(adminUsers?.map(a => a.user_id) || []);

  // Filter out admins
  const participants = allUsers?.filter(user => !adminIds.has(user.id)) || [];

  // Get all bookings with events for these participants
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

  // Create a map of user_id -> events with attendance
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

  // Process each participant
  const participantData: ParticipantData[] = participants.map(participant => {
    const userEvents = attendanceByUser.get(participant.id) || new Map();
    
    // Get all events for this user, sorted by date
    const events = Array.from(userEvents.values()).sort((a, b) => 
      a.dateTime.getTime() - b.dateTime.getTime()
    );

    // Find initial FUN/Assessment Day (first one)
    const initialFunAssessment = events.find(e => e.eventType === 'fun_assessment_day');
    const initialFunDate = initialFunAssessment?.dateTime;

    // Find first DEXA Scan
    const firstDexaScan = events.find(e => e.eventType === 'dexa_scan');
    const firstDexaDate = firstDexaScan?.dateTime;

    // Find touchpoints (after DEXA scan, up to 9)
    const touchpoints: (string | null)[] = [];
    if (firstDexaDate) {
      const touchpointEvents = events
        .filter(e => e.eventType === 'touchpoints' && e.dateTime >= firstDexaDate)
        .slice(0, 9);
      
      for (let i = 0; i < 9; i++) {
        touchpoints.push(
          touchpointEvents[i] 
            ? touchpointEvents[i].dateTime.toLocaleDateString()
            : null
        );
      }
    } else {
      // No DEXA scan yet, so no touchpoints
      for (let i = 0; i < 9; i++) {
        touchpoints.push(null);
      }
    }

    // Find reinforcement FUN/Assessment Day (after DEXA scan, excluding initial)
    const reinforcementFunAssessment = events.find(
      e => e.eventType === 'fun_assessment_day' 
        && e.dateTime >= (firstDexaDate || new Date(0))
        && e.dateTime !== initialFunDate
    );
    const reinforcementFunDate = reinforcementFunAssessment?.dateTime;

    // Find 3 month FUN/Assessment Day (3 months after initial)
    let threeMonthFunAssessment: string | null = null;
    if (initialFunDate) {
      const threeMonthsLater = new Date(initialFunDate);
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      
      const threeMonthEvent = events.find(
        e => e.eventType === 'fun_assessment_day' 
          && e.dateTime >= threeMonthsLater
      );
      threeMonthFunAssessment = threeMonthEvent 
        ? threeMonthEvent.dateTime.toLocaleDateString()
        : null;
    }

    return {
      id: participant.id,
      name: participant.name || 'Unknown',
      phone_number: participant.phone_number,
      group: 'intervention', // Default to intervention for now
      initialFunAssessment: initialFunDate?.toLocaleDateString() || null,
      firstDexaScan: firstDexaDate?.toLocaleDateString() || null,
      touchpoints,
      reinforcementFunAssessment: reinforcementFunDate?.toLocaleDateString() || null,
      threeMonthFunAssessment,
    };
  });

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
            Participants
          </h1>
          <p className="text-lg text-gray-600">View all participants and their progress</p>
        </div>

        {/* Participants Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-bold text-indigo-600 sticky left-0 bg-white/80 z-10">Name</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Phone Number</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Group</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Initial Fun/Assessment Day</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">First DEXA Scan</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Touchpoint 1</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Touchpoint 2</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Touchpoint 3</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Touchpoint 4</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Touchpoint 5</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Touchpoint 6</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Touchpoint 7</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Touchpoint 8</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Touchpoint 9</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">Reinforcement Fun/Assessment Day</th>
                <th className="text-left py-3 px-4 font-bold text-indigo-600">3 Month Fun/Assessment Day</th>
              </tr>
            </thead>
            <tbody>
              {participantData.length > 0 ? (
                participantData.map((participant) => (
                  <tr key={participant.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-gray-900 sticky left-0 bg-white/80 z-10">{participant.name}</td>
                    <td className="py-3 px-4 text-gray-700">{participant.phone_number || '-'}</td>
                    <td className="py-3 px-4 text-gray-700 capitalize">{participant.group}</td>
                    <td className="py-3 px-4 text-gray-700">{participant.initialFunAssessment || '-'}</td>
                    <td className="py-3 px-4 text-gray-700">{participant.firstDexaScan || '-'}</td>
                    {participant.touchpoints.map((tp, index) => (
                      <td key={index} className="py-3 px-4 text-gray-700">{tp || '-'}</td>
                    ))}
                    <td className="py-3 px-4 text-gray-700">{participant.reinforcementFunAssessment || '-'}</td>
                    <td className="py-3 px-4 text-gray-700">{participant.threeMonthFunAssessment || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={16} className="py-8 text-center text-gray-500">
                    No participants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
