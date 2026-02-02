import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile, isAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import AdminParticipantDataEntry from './ui';

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

export default async function AdminEventParticipantEntryPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { user, error } = await getUserProfile();
  if (error || !user) redirect('/login');

  const admin = await isAdmin();
  if (!admin) redirect('/dashboard');

  const supabase = await createClient();
  const { id: eventId, userId: participantId } = await params;

  const { data: event } = await supabase
    .from('events')
    .select('id, title, date_time, event_type, location')
    .eq('id', eventId)
    .single();

  if (!event) redirect('/admin/events');

  const { data: participant } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('id', participantId)
    .single();

  if (!participant) redirect(`/admin/events/${eventId}`);

  const { data: existing } = await supabase
    .from('event_participant_data')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', participantId)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href={`/admin/events/${eventId}`}
            className="text-indigo-600 hover:text-indigo-700 mb-4 inline-flex items-center gap-2 font-semibold transition-colors"
          >
            <span>←</span> Back to event
          </Link>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Data entry</h1>
                <p className="text-gray-700 font-semibold">{participant.name}</p>
                <p className="text-gray-600 text-sm">{participant.email}</p>
                <p className="text-gray-600 mt-2">
                  {event.title} · {new Date(event.date_time).toLocaleDateString()} ·{' '}
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

        <AdminParticipantDataEntry
          eventId={eventId}
          userId={participantId}
          eventType={event.event_type as EventType}
          initial={existing || null}
        />
      </div>
    </div>
  );
}

