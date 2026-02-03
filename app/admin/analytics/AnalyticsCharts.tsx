'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsChartsProps {
  participationData: Array<{ name: string; completed: number; total: number }>;
  touchpointData: Array<{ name: string; completed: number; total: number }>;
  avgGripStrength: number;
  avgChairStand: number;
  avgSingleLegStand: number;
  inbodyRate: number;
  activeUsers: number;
  totalParticipants: number;
}

const COLORS = ['#4f46e5', '#7c3aed', '#a855f7', '#c084fc', '#d946ef', '#ec4899', '#f43f5e', '#fb7185', '#fda4af'];

export default function AnalyticsCharts({
  participationData,
  touchpointData,
  avgGripStrength,
  avgChairStand,
  avgSingleLegStand,
  inbodyRate,
  activeUsers,
  totalParticipants,
}: AnalyticsChartsProps) {
  // Prepare data for participation chart (completion percentage)
  const participationChartData = participationData.map(item => ({
    name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
    fullName: item.name,
    completed: item.completed,
    percentage: item.total > 0 ? ((item.completed / item.total) * 100).toFixed(1) : 0,
  }));

  // Prepare data for touchpoint progression
  const touchpointChartData = touchpointData.map(item => ({
    name: item.name,
    completed: item.completed,
    percentage: item.total > 0 ? ((item.completed / item.total) * 100).toFixed(1) : 0,
  }));

  // Active vs Inactive users pie chart data
  const inactiveUsers = totalParticipants - activeUsers;
  const activeInactiveData = [
    { name: 'Active', value: activeUsers },
    { name: 'Inactive', value: inactiveUsers },
  ];

  return (
    <div className="space-y-8">
      {/* Participation Statistics */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-indigo-600 mb-6">Participation Statistics</h2>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={participationChartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={120}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip 
              formatter={(value: any, name: any) => {
                const data = participationChartData.find(d => d.completed === value);
                if (data) {
                  return [`${value} participants (${data.percentage}%)`, 'Completed'];
                }
                return [`${value}`, 'Completed'];
              }}
              labelFormatter={(label: any) => {
                const data = participationChartData.find(d => d.name === label);
                return data?.fullName || label;
              }}
            />
            <Legend />
            <Bar dataKey="completed" fill="#4f46e5" name="Completed" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Touchpoint Progression */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-indigo-600 mb-6">Touchpoint Completion Progression</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={touchpointChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                `${value} participants (${props.payload.percentage}%)`,
                'Completed'
              ]}
            />
            <Legend />
            <Bar dataKey="completed" fill="#7c3aed" name="Completed" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Fun/Assessment Day Averages */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-indigo-600 mb-4">Average Metrics (Fun/Assessment Day)</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">Grip Strength</p>
                <p className="text-2xl font-bold text-indigo-600">{avgGripStrength > 0 ? avgGripStrength.toFixed(1) : '-'} kg</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">30-Second Chair Stand</p>
                <p className="text-2xl font-bold text-blue-600">{avgChairStand > 0 ? avgChairStand.toFixed(1) : '-'} reps</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">Single Leg Stand</p>
                <p className="text-2xl font-bold text-purple-600">{avgSingleLegStand > 0 ? avgSingleLegStand.toFixed(1) : '-'} sec</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">Inbody Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">{inbodyRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* User Activity Overview */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-indigo-600 mb-4">User Activity Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={activeInactiveData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {activeInactiveData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
