// src/components/ActionLog.tsx
'use client';

import React from 'react';
import { useCrowdState } from '@/hooks/useCrowdState';
import { Terminal, CheckCircle2, AlertTriangle } from 'lucide-react';

export const ActionLog: React.FC = () => {
  const { alerts, acknowledgeAlert } = useCrowdState();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-rose-500" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">Intervention & Incident Logs</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full">
          {alerts.filter(a => !a.acknowledged).length} Active
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3 rounded-lg border text-xs font-mono transition-all ${
              alert.acknowledged
                ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                : 'bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-500/5'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-1.5">
                <AlertTriangle className={`w-3.5 h-3.5 ${alert.severity === 'CRITICAL' ? 'text-rose-500 animate-bounce' : 'text-amber-500'}`} />
                <span className="font-bold text-slate-200">{alert.nodeName}</span>
              </div>
              <span className="text-[10px] text-slate-500">{alert.timestamp}</span>
            </div>

            <p className="text-slate-300 text-[11px] mb-2">{alert.message}</p>

            {!alert.acknowledged && (
              <button
                onClick={() => acknowledgeAlert(alert.id)}
                className="flex items-center space-x-1 px-2 py-1 bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 rounded text-[10px] font-medium ml-auto transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Acknowledge & Clear</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};