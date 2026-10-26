// src/app/dashboard/page.tsx
'use client';

import React from 'react';
import { useCrowdState } from '@/hooks/useCrowdState';
import { VideoPlayer } from '@/components/VideoPlayer';
import { DigitalTwinMini } from '@/components/DigitalTwinMini';
import { GaugeWidget } from '@/components/GaugeWidget';
import { ActionLog } from '@/components/ActionLog';
import { Users, Bell, Activity } from 'lucide-react';

export default function DashboardPage() {
  const { telemetry, alerts } = useCrowdState();
  const activeAlerts = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Total Crowd Count</span>
            <h3 className="text-2xl font-bold font-mono text-white mt-1">{telemetry.totalCrowdCount}</h3>
          </div>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <Users className="w-5 h-5 text-rose-500" />
          </div>
        </div>

        <GaugeWidget
          title="Average Station Density"
          value={telemetry.averageDensity}
          subtitle="Optimal threshold: < 80%"
        />

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Alerts</span>
            <h3 className="text-2xl font-bold font-mono text-rose-400 mt-1">{activeAlerts}</h3>
          </div>
          <div className="p-3 bg-rose-600/20 border border-rose-500/30 rounded-xl">
            <Bell className="w-5 h-5 text-rose-500 animate-bounce" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">System Status</span>
            <h3 className="text-sm font-bold font-mono text-emerald-400 mt-2 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>YOLOv8 AI Active</span>
            </h3>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Activity className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Main Grid: Cameras & Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Video Streams Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
              High-Risk Bottleneck Camera Feeds
            </h2>
            <span className="text-xs font-mono text-slate-400">Showing {telemetry.nodes.length} Active Nodes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {telemetry.nodes.map((node) => (
              <VideoPlayer key={node.id} node={node} />
            ))}
          </div>
        </div>

        {/* Right 1 Col: Digital Twin & Intervention Terminal */}
        <div className="space-y-6">
          <DigitalTwinMini />
          <ActionLog />
        </div>
      </div>
    </div>
  );
}