// src/app/cameras/page.tsx
'use client';

import React from 'react';
import { useCrowdState } from '@/hooks/useCrowdState';
import { VideoPlayer } from '@/components/VideoPlayer';

export default function CamerasPage() {
  const { telemetry } = useCrowdState();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono text-slate-100 uppercase tracking-wide">4-Node Camera Grid</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">Real-time YOLOv8 bounding box inference and feed monitoring.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {telemetry.nodes.map((node) => (
          <VideoPlayer key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}