// src/app/map/page.tsx
'use client';

import React from 'react';
import { useCrowdState } from '@/hooks/useCrowdState';

export default function MapPage() {
  const { telemetry } = useCrowdState();

  const getNode = (id: string) => telemetry.nodes.find(n => n.id === id);

  const getZoneColor = (density: number) => {
    if (density > 90) return 'fill-rose-500/80 stroke-rose-400 animate-pulse';
    if (density > 75) return 'fill-amber-500/70 stroke-amber-400';
    return 'fill-emerald-500/60 stroke-emerald-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono text-slate-100 uppercase tracking-wide">Digital Twin SVG Map</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">Spatial station layout and real-time zone density heatmaps.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <div className="relative aspect-video bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center p-4">
          <svg viewBox="0 0 800 400" className="w-full h-full">
            {/* Concourse Gate */}
            <g>
              <rect
                x="50"
                y="50"
                width="700"
                height="80"
                rx="12"
                className={`transition-all duration-500 ${getZoneColor(getNode('cam-2')?.density || 50)}`}
                strokeWidth="3"
              />
              <text x="80" y="95" fill="#ffffff" fontSize="14" fontFamily="monospace" fontWeight="bold">
                East Concourse Entry Gate ({getNode('cam-2')?.density || 0}%)
              </text>
            </g>

            {/* Platform Area */}
            <g>
              <rect
                x="50"
                y="180"
                width="330"
                height="170"
                rx="12"
                className={`transition-all duration-500 ${getZoneColor(getNode('cam-1')?.density || 50)}`}
                strokeWidth="3"
              />
              <text x="80" y="270" fill="#ffffff" fontSize="14" fontFamily="monospace" fontWeight="bold">
                Platform 1 & 2 Main Stairs ({getNode('cam-1')?.density || 0}%)
              </text>
            </g>

            {/* Overbridge */}
            <g>
              <rect
                x="420"
                y="180"
                width="330"
                height="170"
                rx="12"
                className={`transition-all duration-500 ${getZoneColor(getNode('cam-3')?.density || 50)}`}
                strokeWidth="3"
              />
              <text x="450" y="270" fill="#ffffff" fontSize="14" fontFamily="monospace" fontWeight="bold">
                Foot Over Bridge FOB-B ({getNode('cam-3')?.density || 0}%)
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}