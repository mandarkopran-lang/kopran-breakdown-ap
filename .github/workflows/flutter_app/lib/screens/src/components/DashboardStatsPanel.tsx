import React from 'react';
import { DashboardStats } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Play, CheckCircle2, Clock, Activity, AlertTriangle, HelpCircle, UserX, Award 
} from 'lucide-react';

interface DashboardStatsPanelProps {
  stats: DashboardStats;
}

export default function DashboardStatsPanel({ stats }: DashboardStatsPanelProps) {
  // Convert machine breakdown counts into a structured array for Recharts
  const barData = Object.keys(stats.machineBreakdowns || {}).map(machine => ({
    name: machine.split(' ').slice(0, 2).join(' '), // truncate for label spacing
    fullName: machine,
    count: stats.machineBreakdowns[machine]
  })).sort((a, b) => b.count - a.count).slice(0, 5); // top 5 machines

  const pieData = [
    { name: 'Open', value: stats.openIssues, color: '#f59e0b' },
    { name: 'In Progress', value: stats.inProgressIssues, color: '#6366f1' },
    { name: 'Resolved', value: stats.resolvedIssues, color: '#10b981' },
    { name: 'Closed', value: stats.closedIssues, color: '#64748b' }
  ].filter(item => item.value > 0);

  // Fallback pie data if all values are 0
  const cleanPieData = pieData.length > 0 ? pieData : [{ name: 'No Active Incidents', value: 1, color: '#475569' }];

  const formatTime = (minutes: number) => {
    if (minutes <= 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  return (
    <div id="dashboard-stats-panel" className="space-y-6">
      
      {/* 1. KPIs Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Open */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Open Raw</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-left">{stats.openIssues}</h3>
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mt-1">Pending allocation</p>
          </div>
        </div>

        {/* Assigned & In Progress */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">In Repair</span>
            <Activity className="h-4 w-4 text-indigo-650 text-indigo-600 animate-pulse" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-left">{stats.inProgressIssues}</h3>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-1">Under troubleshooting</p>
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-left">{stats.resolvedIssues}</h3>
            <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-1">Awaiting verification</p>
          </div>
        </div>

        {/* Closed */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Closed</span>
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-left">{stats.closedIssues}</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">SLA fulfilled</p>
          </div>
        </div>

        {/* Average MTTR (Mean Time to Repair) */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl col-span-2 lg:col-span-1 flex flex-col justify-between shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mean MTTR</span>
            <Clock className="h-4 w-4 text-indigo-650 text-indigo-600" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-left">
              {formatTime(stats.avgResolutionTimeMinutes)}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Resolution average</p>
          </div>
        </div>

      </div>

      {/* 2. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Machine Breakdown Frequencies Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col shadow-sm" id="frequency-bar-chart">
          <div className="mb-4 text-left">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">Failure Frequent Frequencies</h4>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Top machines with registered breakdown records</p>
          </div>
          <div className="h-64 w-full flex-grow">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                    labelClassName="text-slate-900 text-xs font-bold font-sans"
                    itemStyle={{ color: '#4f46e5', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(value) => [`${value} Incident(s)`, 'Frequency']}
                  />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <HelpCircle className="h-8 w-8 text-slate-300 mb-2 stroke-[1.5]" />
                <span>No failure history recorded for machines yet.</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown Circle Ring Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col shadow-sm" id="status-pie-chart">
          <div className="mb-4 text-left">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">Breakdown Distribution</h4>
            <p className="text-[10px] sm:text-xs text-slate-505 text-slate-550 text-slate-500 font-medium">Distribution share of incidents by lifecycle state</p>
          </div>
          <div className="h-64 w-full flex-grow flex items-center justify-center">
            {pieData.length > 0 || stats.closedIssues > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cleanPieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {cleanPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                    itemStyle={{ color: '#0f172a', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="rect"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', color: '#475569', fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 stroke-[1.5]" />
                <span>All machinery fully active! Zero breakdowns.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Engineering Team performance summary */}
      <div className="bg-white p-5 rounded-xl border border-slate-205 border-slate-200 flex flex-col shadow-sm" id="engineer-performance-panel">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-left">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-4 w-4 text-indigo-650 text-indigo-600" />
              Maintenance Engineering Roster & Metrics
            </h4>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Real-time status of assigned workloads and average resolution times</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-[#f8fafc]">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-505 text-slate-500 uppercase tracking-widest leading-none">
                  Engineer Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-505 text-slate-500 uppercase tracking-widest leading-none">
                  Mobile Identity
                </th>
                <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-slate-505 text-slate-500 uppercase tracking-widest leading-none">
                  Repairs Completed
                </th>
                <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-slate-505 text-slate-500 uppercase tracking-widest leading-none">
                  Average MTTR Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-transparent">
              {stats.engineerPerformance && stats.engineerPerformance.length > 0 ? (
                stats.engineerPerformance.map((eng) => (
                  <tr key={eng.mobile} className="hover:bg-slate-100/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-900 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {eng.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-505 text-slate-500 font-medium">
                      {eng.mobile}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-center text-slate-900 font-bold">
                      <span className="px-2.5 py-1 bg-white rounded-lg text-[10px] text-slate-700 font-bold border border-slate-205 border-slate-200">
                        {eng.resolvedCount} completed
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-right text-indigo-700 font-mono font-bold">
                      {eng.resolvedCount > 0 ? formatTime(eng.avgTimeMinutes) : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-xs font-medium">
                    No engineers registered in primary roster list.
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
