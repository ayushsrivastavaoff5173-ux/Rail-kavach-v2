// src/components/DigitalTwinMini.tsx
'use client';

import React from 'react';
import { useCrowdState } from '@/hooks/useCrowdState';
import { MapPin, Activity } from 'lucide-react';

export const DigitalTwinMini: React.FC = () => {
  const { telemetry } = useCrowdState();

  const getNodeDensity = (id: string) => {
    const node = telemetry.nodes.find(n => n.id === id);
    return node ? node.density : 50;
  };

  const getZoneColor = (density: number) => {
    if (density > 90) return 'fill-rose-500/80 stroke-rose-400 animate-pulse';
    if (density > 75) return 'fill-amber-500/70 stroke-amber-400';
    return 'fill-emerald-500/60 stroke-emerald-400';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-rose-500" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">Station Digital Twin (Blueprint)</h3>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-400">
          <Activity className="w-3 h-3 animate-pulse" />
          <span>Real-time Sync</span>
        </div>
      </div>

      <div className="relative aspect-video bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center p-2 overflow-hidden">
        {/* SVG Station Map Layout */}
        <svg viewBox="0 0 400 200" className="w-full h-full">
          {/* Concourse Area */}
          <rect
            x="30"
            y="30"
            width="340"
            height="40"
            rx="6"
            className={`transition-all duration-500 ${getZoneColor(getNodeDensity('cam-2'))}`}
            strokeWidth="2"
          />
          <text x="50" y="55" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">East Concourse Gate</text>

          {/* Platforms Area */}
          <rect
            x="30"
            y="90"
            width="160"
            height="80"
            rx="6"
            className={`transition-all duration-500 ${getZoneColor(getNodeDensity('cam-1'))}`}
            strokeWidth="2"
          />
          <text x="50" y="135" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">Platform 1 & 2 Stairs</text>

          {/* Overbridge */}
          <rect
            x="210"
            y="90"
            width="160"
            height="80"
            rx="6"
            className={`transition-all duration-500 ${getZoneColor(getNodeDensity('cam-3'))}`}
            strokeWidth="2"
          />
          <text x="230" y="135" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">Foot Over Bridge (FOB-B)</text>
        </svg>
      </div>
    </div>
  );
};