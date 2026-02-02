import { createClient } from '@/lib/supabase/server';

export type MissionStatus = 'not_started' | 'incomplete' | 'completed';

export interface Mission {
  id: number;
  title: string;
  description: string;
  status: MissionStatus;
  isLocked: boolean;
  progress?: string; // e.g., "3/10 completed" for mission 3
  unlockDate?: Date; // For mission 4
}

/**
 * Get mission status based on user's bookings and attendance
 */
export async function getUserMissions(userId: string): Promise<Mission[]> {
  const supabase = await createClient();

  // Get all user's bookings with events
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      event_id,
      events (
        id,
        event_type,
        date_time
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'confirmed');

  // Get all user's event participant data (attendance records)
  const { data: participantData } = await supabase
    .from('event_participant_data')
    .select('event_id, attendance')
    .eq('user_id', userId);

  const attendanceByEventId = new Map<string, boolean>();
  (participantData || []).forEach((pd: any) => {
    if (pd.attendance === true) {
      attendanceByEventId.set(pd.event_id, true);
    }
  });

  // Organize events by type
  const funAssessmentEvents: Array<{ eventId: string; dateTime: Date; hasAttendance: boolean }> = [];
  const dexaScanEvents: Array<{ eventId: string; dateTime: Date; hasAttendance: boolean }> = [];
  const touchpointEvents: Array<{ eventId: string; dateTime: Date; hasAttendance: boolean }> = [];

  (bookings || []).forEach((booking: any) => {
    const event = booking.events;
    if (!event) return;

    const eventDate = new Date(event.date_time);
    const hasAttendance = attendanceByEventId.get(event.id) === true;

    if (event.event_type === 'fun_assessment_day') {
      funAssessmentEvents.push({
        eventId: event.id,
        dateTime: eventDate,
        hasAttendance,
      });
    } else if (event.event_type === 'dexa_scan') {
      dexaScanEvents.push({
        eventId: event.id,
        dateTime: eventDate,
        hasAttendance,
      });
    } else if (event.event_type === 'touchpoints') {
      touchpointEvents.push({
        eventId: event.id,
        dateTime: eventDate,
        hasAttendance,
      });
    }
  });

  // Sort by date
  funAssessmentEvents.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  dexaScanEvents.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  touchpointEvents.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

  // Mission 1: FUN/Assessment Day (first)
  const mission1Event = funAssessmentEvents[0];
  const mission1Status: MissionStatus = mission1Event
    ? mission1Event.hasAttendance
      ? 'completed'
      : 'incomplete'
    : 'not_started';

  // Mission 2: DEXA Scan (after mission 1 is completed)
  const mission2Event = dexaScanEvents[0];
  const mission2Status: MissionStatus =
    mission1Status === 'completed'
      ? mission2Event
        ? mission2Event.hasAttendance
          ? 'completed'
          : 'incomplete'
        : 'not_started'
      : 'not_started';

  // Mission 3: 9 Touchpoints & 1 FUN/Assessment Day (after mission 2 is completed)
  // Users can book any of these 10 events (any combination of touchpoints and FUN assessment days)
  // Count completed touchpoints and FUN assessment days (excluding mission 1)
  const completedTouchpoints = touchpointEvents.filter((e) => e.hasAttendance).length;
  const completedFunAfterMission1 = funAssessmentEvents
    .slice(1)
    .filter((e) => e.hasAttendance).length;
  const totalCompleted = completedTouchpoints + completedFunAfterMission1;
  
  // Count total bookings (for progress display)
  const totalBooked = touchpointEvents.length + Math.max(0, funAssessmentEvents.length - 1);
  
  const mission3Status: MissionStatus =
    mission2Status === 'completed'
      ? totalCompleted >= 10
        ? 'completed'
        : totalBooked > 0
          ? 'incomplete'
          : 'not_started'
      : 'not_started';

  // Mission 4: Post 3 months FUN/Assessment Day
  // This is mandatory and shows up but greyed out until 3 months after mission 1
  const mission1Date = mission1Event?.dateTime;
  // Calculate 3 months later (approximately 91 days, but using months for accuracy)
  const threeMonthsLater = mission1Date
    ? (() => {
        const date = new Date(mission1Date);
        date.setMonth(date.getMonth() + 3);
        return date;
      })()
    : null;
  const now = new Date();
  const isMission4Unlocked = mission1Date && now >= threeMonthsLater;

  // Find the post-3-months FUN assessment day event
  const mission4Event = isMission4Unlocked
    ? funAssessmentEvents.find((e) => e.dateTime >= threeMonthsLater && e.hasAttendance)
    : null;
  const mission4Status: MissionStatus = isMission4Unlocked
    ? mission4Event
      ? 'completed'
      : funAssessmentEvents.some((e) => e.dateTime >= threeMonthsLater)
        ? 'incomplete'
        : 'not_started'
    : 'not_started';

  const missions: Mission[] = [
    {
      id: 1,
      title: 'FUN/Assessment Day',
      description: 'Complete your first assessment day',
      status: mission1Status,
      isLocked: false,
    },
    {
      id: 2,
      title: 'DEXA Scan',
      description: 'Complete your DEXA scan',
      status: mission2Status,
      isLocked: mission1Status !== 'completed',
    },
    {
      id: 3,
      title: '9 Touchpoints & FUN/Assessment Day',
      description: 'Complete 9 touchpoints and 1 additional FUN/Assessment Day',
      status: mission3Status,
      isLocked: mission2Status !== 'completed',
      progress: mission3Status !== 'not_started' ? `${totalCompleted}/10 completed (${totalBooked} booked)` : undefined,
    },
    {
      id: 4,
      title: 'Post 3 Months FUN/Assessment Day',
      description: 'Complete your 3-month follow-up assessment',
      status: mission4Status,
      isLocked: !isMission4Unlocked,
      unlockDate: threeMonthsLater || undefined,
    },
  ];

  return missions;
}
