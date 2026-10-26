// src/app/analytics/page.tsx
'use client';

import React from 'react';
import { useCrowdState } from '@/hooks/useCrowdState';
import { TrendingUp, Shield } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const mockChartData = [
  { time: '08:00', crowd: 450, density: 40 },
  { time: '09:00', crowd: 980, density: 75 },
  { time: '10:00', crowd: 1685, density: 88 },
  { time: '11:00', crowd: 1420, density: 70 },
  { time: '12:00', crowd: 1100, density: 60 },
  { time: '13:00', crowd: 1350, density: 72 },
];

export default function AnalyticsPage() {
  const { telemetry } = useCrowdState();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono text-slate-100 uppercase tracking-wide">Advanced Analytics & Reports</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">Recharts telemetry trend visualization and peak rush hour forecasting.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-rose-500" />
            <span>Hourly Inflow Volume Trend</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="crowd" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Node Density Comparison</span>
          </h3>
          <div className="space-y-4 font-mono text-xs">
            {telemetry.nodes.map((node) => (
              <div key={node.id} className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>{node.name}</span>
                  <strong className={node.density > 90 ? 'text-rose-400' : 'text-emerald-400'}>{node.density}%</strong>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${node.density > 90 ? 'bg-rose-500' : node.density > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${node.density}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}