import Link from 'next/link';
import { Mission } from '@/lib/api/missions';

interface MissionsPanelProps {
  missions: Mission[];
}

export default function MissionsPanel({ missions }: MissionsPanelProps) {
  // Filter missions to show only unlocked ones (except mission 5 which always shows)
  const visibleMissions = missions.filter(
    (mission) => !mission.isLocked || mission.id === 5
  );

  if (visibleMissions.length === 0) {
    return null;
  }

  const getStatusBadge = (status: Mission['status'], isLocked: boolean) => {
    if (isLocked) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500 border border-gray-200">
          Locked
        </span>
      );
    }

    switch (status) {
      case 'completed':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-200">
            ✓ Completed
          </span>
        );
      case 'incomplete':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
            In Progress
          </span>
        );
      case 'not_started':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
            Not Started
          </span>
        );
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 mb-10 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-indigo-600">Missions</h2>
        <Link href="/events" className="text-indigo-600 hover:underline text-sm font-semibold">
          Browse Events →
        </Link>
      </div>

      <div className="space-y-4">
        {visibleMissions.map((mission) => {
          const isGreyedOut = mission.isLocked && mission.id === 5;
          
          return (
            <div
              key={mission.id}
              className={`rounded-xl p-5 border transition-all duration-300 ${
                isGreyedOut
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : mission.status === 'completed'
                    ? 'bg-green-50/50 border-green-200'
                    : mission.status === 'incomplete'
                      ? 'bg-yellow-50/50 border-yellow-200'
                      : 'bg-indigo-50/50 border-indigo-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3
                      className={`font-bold text-lg ${
                        isGreyedOut ? 'text-gray-500' : 'text-indigo-700'
                      }`}
                    >
                      Mission {mission.id}: {mission.title}
                    </h3>
                    {getStatusBadge(mission.status, mission.isLocked)}
                  </div>
                  <p
                    className={`text-sm ${
                      isGreyedOut ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {mission.description}
                  </p>
                  {mission.progress && (
                    <p className="text-sm font-semibold text-indigo-600 mt-2">
                      {mission.progress}
                    </p>
                  )}
                  {mission.unlockDate && mission.isLocked && (
                    <p className="text-sm text-gray-500 mt-2">
                      Unlocks on {mission.unlockDate.toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
