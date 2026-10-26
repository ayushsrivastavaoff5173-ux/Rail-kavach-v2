// src/app/about/page.tsx
'use client';

import React from 'react';
import { Cpu, Layers } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-mono text-slate-100 uppercase tracking-wide">Architecture & Team (Code Red)</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">RailKavach autonomous railway platform crowd monitoring and stampede early warning system.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6 font-mono text-xs">
        <div>
          <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-2">System Architecture Overview</h3>
          <p className="text-slate-300 leading-relaxed text-sm font-sans">
            RailKavach utilizes edge computer vision models (YOLOv8) running on CCTV nodes to compute bounding box density metrics in real time. Telemetry is streamed over WebSockets and Python FastAPI backends, consuming dual-engine state management on a Next.js App Router frontend.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <h4 className="font-bold text-slate-200 mb-1 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-rose-500" />
              <span>Frontend Stack</span>
            </h4>
            <p className="text-slate-400">Next.js, TypeScript, Tailwind CSS, Recharts, Lucide Icons</p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <h4 className="font-bold text-slate-200 mb-1 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>Backend & AI</span>
            </h4>
            <p className="text-slate-400">Python FastAPI, WebSockets, YOLOv8 Computer Vision</p>
          </div>
        </div>
      </div>
    </div>
  );
}