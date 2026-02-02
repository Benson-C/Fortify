'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type EventType = 'fun_assessment_day' | 'dexa_scan' | 'touchpoints' | string;

type ParticipantDataRow = {
  event_id: string;
  user_id: string;
  attendance: boolean | null;
  grip_strength: number | null;
  inbody: boolean | null;
  chair_stand_30s: number | null;
  single_leg_stand: number | null;
  up_down_step_count: number | null;
  dexa_scanned: boolean | null;
};

function parseNumber(v: string): number | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function AdminParticipantDataEntry({
  eventId,
  userId,
  eventType,
  initial,
}: {
  eventId: string;
  userId: string;
  eventType: EventType;
  initial: Partial<ParticipantDataRow> | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string>('');

  const initialState = useMemo(() => {
    return {
      attendance: initial?.attendance ?? null,
      grip_strength: initial?.grip_strength ?? null,
      inbody: initial?.inbody ?? null,
      chair_stand_30s: initial?.chair_stand_30s ?? null,
      single_leg_stand: initial?.single_leg_stand ?? null,
      up_down_step_count: initial?.up_down_step_count ?? null,
      dexa_scanned: initial?.dexa_scanned ?? null,
    };
  }, [initial]);

  const [attendance, setAttendance] = useState<boolean | null>(initialState.attendance);
  const [gripStrength, setGripStrength] = useState<string>(initialState.grip_strength?.toString() ?? '');
  const [inbody, setInbody] = useState<boolean | null>(initialState.inbody);
  const [chairStand, setChairStand] = useState<string>(initialState.chair_stand_30s?.toString() ?? '');
  const [singleLegStand, setSingleLegStand] = useState<string>(initialState.single_leg_stand?.toString() ?? '');
  const [upDownSteps, setUpDownSteps] = useState<string>(initialState.up_down_step_count?.toString() ?? '');
  const [dexaScanned, setDexaScanned] = useState<boolean | null>(initialState.dexa_scanned);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedMsg('');

    const payload: any = {
      event_id: eventId,
      user_id: userId,
      attendance,
    };

    if (eventType === 'touchpoints') {
      // only attendance
    } else if (eventType === 'dexa_scan') {
      payload.dexa_scanned = dexaScanned;
      payload.inbody = inbody;
      payload.grip_strength = parseNumber(gripStrength);
    } else if (eventType === 'fun_assessment_day') {
      payload.inbody = inbody;
      payload.grip_strength = parseNumber(gripStrength);
      payload.chair_stand_30s = parseNumber(chairStand);
      payload.single_leg_stand = parseNumber(singleLegStand);
      payload.up_down_step_count = parseNumber(upDownSteps);
    }

    const supabase = createClient();
    const { error: upsertError } = await supabase
      .from('event_participant_data')
      .upsert(payload, { onConflict: 'event_id,user_id' });

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    setSavedMsg('Saved');
    setSaving(false);
    router.refresh();
  };

  const BoolToggle = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean | null;
    onChange: (v: boolean | null) => void;
  }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="text-sm font-semibold text-gray-700">{label}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
            value === true ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
            value === false ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          No
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
            value === null ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          —
        </button>
      </div>
    </div>
  );

  const NumberField = ({
    label,
    value,
    onChange,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
          <p className="font-medium">{error}</p>
        </div>
      )}
      {savedMsg && !error && (
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-lg">
          <p className="font-medium">{savedMsg}</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <BoolToggle label="Attendance" value={attendance} onChange={setAttendance} />

        {eventType === 'touchpoints' ? null : eventType === 'dexa_scan' ? (
          <>
            <BoolToggle label="DEXA scanned" value={dexaScanned} onChange={setDexaScanned} />
            <BoolToggle label="Inbody" value={inbody} onChange={setInbody} />
            <NumberField label="Grip Strength" value={gripStrength} onChange={setGripStrength} placeholder="e.g., 32.5" />
          </>
        ) : (
          <>
            <BoolToggle label="Inbody" value={inbody} onChange={setInbody} />
            <NumberField label="Grip Strength" value={gripStrength} onChange={setGripStrength} placeholder="e.g., 32.5" />
            <NumberField label="30-Second Chair Stand Test" value={chairStand} onChange={setChairStand} placeholder="e.g., 12" />
            <NumberField label="Single leg stand" value={singleLegStand} onChange={setSingleLegStand} placeholder="e.g., 18.4" />
            <NumberField label="Up-down Step count" value={upDownSteps} onChange={setUpDownSteps} placeholder="e.g., 22" />
          </>
        )}
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/30"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

