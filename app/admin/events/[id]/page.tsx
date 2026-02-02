import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile, isAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

type EventType = 'fun_assessment_day' | 'dexa_scan' | 'touchpoints' | string;

function eventTypeLabel(t: EventType) {
  switch (t) {
    case 'fun_assessment_day':
      return 'FUN/Assessment Day';
    case 'dexa_scan':
      return 'DEXA Scan';
    case 'touchpoints':
      return 'Touchpoints';
    default:
      return t;
  }
}

function columnsForType(t: EventType) {
  if (t === 'fun_assessment_day') {
    return [
      'Attendance',
      'Grip Strength',
      '30-Second Chair Stand Test',
      'Single leg stand',
      'Up-down Step count',
      'Inbody',
    ] as const;
  }
  if (t === 'dexa_scan') {
    return ['Attendance', 'DEXA scanned', 'Inbody', 'Grip Strength'] as const;
  }
  return ['Attendance'] as const; // touchpoints
}

export default async function AdminEventParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, error } = await getUserProfile();
  if (error || !user) redirect('/login');

  const admin = await isAdmin();
  if (!admin) redirect('/dashboard');

  const supabase = await createClient();
  const { id: eventId } = await params;

  const { data: event } = await supabase
    .from('events')
    .select('id, title, date_time, event_type, location')
    .eq('id', eventId)
    .single();

  if (!event) {
    redirect('/admin/events');
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select(
      `
      user_id,
      status,
      users (
        id,
        name,
        email,
        phone_number,
        id_number
      )
    `
    )
    .eq('event_id', eventId)
    .eq('status', 'confirmed');

  const userIds = (bookings || []).map((b: any) => b.user_id).filter(Boolean);

  const { data: existingRows } = userIds.length
    ? await supabase
        .from('event_participant_data')
        .select('*')
        .eq('event_id', eventId)
        .in('user_id', userIds)
    : { data: [] as any[] };

  const dataByUser = new Map<string, any>();
  (existingRows || []).forEach((row: any) => dataByUser.set(row.user_id, row));

  const cols = columnsForType(event.event_type as EventType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/admin/events"
            className="text-indigo-600 hover:text-indigo-700 mb-4 inline-flex items-center gap-2 font-semibold transition-colors"
          >
            <span>←</span> Back to Manage Events
          </Link>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{event.title}</h1>
                <p className="text-gray-600">
                  {new Date(event.date_time).toLocaleDateString()} ·{' '}
                  {new Date(event.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
              </div>
              <span className="px-3 py-1.5 text-sm font-bold rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200">
                {eventTypeLabel(event.event_type as EventType)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-indigo-600">Signed-up Users</h2>
            <p className="text-sm text-gray-600">
              {bookings?.length || 0} confirmed
            </p>
          </div>

          {bookings && bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-3 pr-4 font-semibold">Name</th>
                    <th className="py-3 pr-4 font-semibold">Email</th>
                    <th className="py-3 pr-4 font-semibold">Phone</th>
                    <th className="py-3 pr-6 font-semibold">ID</th>
                    {cols.map((c) => (
                      <th key={c} className="py-3 pr-4 font-semibold whitespace-nowrap">{c}</th>
                    ))}
                    <th className="py-3 pr-2 font-semibold">Entry</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b: any) => {
                    const u = b.users;
                    const row = dataByUser.get(u?.id);
                    const href = `/admin/events/${eventId}/participants/${u?.id}`;

                    return (
                      <tr key={u?.id} className="border-b last:border-b-0 hover:bg-gray-50/60">
                        <td className="py-3 pr-4 font-semibold text-indigo-700">
                          <Link href={href} className="hover:underline">
                            {u?.name || 'User'}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-gray-700">{u?.email || ''}</td>
                        <td className="py-3 pr-4 text-gray-700">{u?.phone_number || ''}</td>
                        <td className="py-3 pr-6 text-gray-700">{u?.id_number || ''}</td>

                        {/* Dynamic columns */}
                        {event.event_type === 'fun_assessment_day' && (
                          <>
                            <td className="py-3 pr-4">{row?.attendance === true ? 'Yes' : row?.attendance === false ? 'No' : ''}</td>
                            <td className="py-3 pr-4">{row?.grip_strength ?? ''}</td>
                            <td className="py-3 pr-4">{row?.chair_stand_30s ?? ''}</td>
                            <td className="py-3 pr-4">{row?.single_leg_stand ?? ''}</td>
                            <td className="py-3 pr-4">{row?.up_down_step_count ?? ''}</td>
                            <td className="py-3 pr-4">{row?.inbody === true ? 'Yes' : row?.inbody === false ? 'No' : ''}</td>
                          </>
                        )}
                        {event.event_type === 'dexa_scan' && (
                          <>
                            <td className="py-3 pr-4">{row?.attendance === true ? 'Yes' : row?.attendance === false ? 'No' : ''}</td>
                            <td className="py-3 pr-4">{row?.dexa_scanned === true ? 'Yes' : row?.dexa_scanned === false ? 'No' : ''}</td>
                            <td className="py-3 pr-4">{row?.inbody === true ? 'Yes' : row?.inbody === false ? 'No' : ''}</td>
                            <td className="py-3 pr-4">{row?.grip_strength ?? ''}</td>
                          </>
                        )}
                        {event.event_type === 'touchpoints' && (
                          <>
                            <td className="py-3 pr-4">{row?.attendance === true ? 'Yes' : row?.attendance === false ? 'No' : ''}</td>
                          </>
                        )}

                        <td className="py-3 pr-2">
                          <Link
                            href={href}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                          >
                            Enter →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No confirmed sign-ups for this event yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

