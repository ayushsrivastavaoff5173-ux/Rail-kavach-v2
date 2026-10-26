// src/app/simulation/page.tsx
'use client';

import React from 'react';
import { useCrowdState } from '@/hooks/useCrowdState';
import { RotateCcw } from 'lucide-react';

export default function SimulationPage() {
  const { simulation, updateSimulation } = useCrowdState();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono text-slate-100 uppercase tracking-wide">Scenario Lab & Simulation</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">Test emergency crowd control maneuvers by modulating inflow and outflow parameters.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg max-w-2xl space-y-6 font-mono text-xs">
        <div className="space-y-2">
          <label className="text-slate-300 flex justify-between">
            <span>Inflow Rate (People/min):</span>
            <strong className="text-rose-400">{simulation.inflowRate}</strong>
          </label>
          <input
            type="range"
            min="50"
            max="300"
            value={simulation.inflowRate}
            onChange={(e) => updateSimulation({ inflowRate: Number(e.target.value) })}
            className="w-full accent-rose-500 bg-slate-950"
          />
        </div>

        <div className="space-y-2">
          <label className="text-slate-300 flex justify-between">
            <span>Outflow Rate (People/min):</span>
            <strong className="text-emerald-400">{simulation.outflowRate}</strong>
          </label>
          <input
            type="range"
            min="50"
            max="300"
            value={simulation.outflowRate}
            onChange={(e) => updateSimulation({ outflowRate: Number(e.target.value) })}
            className="w-full accent-emerald-500 bg-slate-950"
          />
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Simulation Engine Active</span>
          </div>
          <button
            onClick={() => updateSimulation({ inflowRate: 120, outflowRate: 100 })}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>
    </div>
  );
}