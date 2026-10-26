// src/app/alerts/page.tsx
'use client';

import React from 'react';
import { useCrowdState } from '@/hooks/useCrowdState';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AlertsPage() {
  const { alerts, acknowledgeAlert } = useCrowdState();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono text-slate-100 uppercase tracking-wide">Incident Logs & Alerts</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">Automated threshold violations and stampede risk audit trail.</p>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono ${
              alert.acknowledged
                ? 'bg-slate-900/40 border-slate-800 opacity-60'
                : 'bg-rose-950/20 border-rose-500/40 shadow-md shadow-rose-500/5'
            }`}
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className={`w-5 h-5 mt-0.5 ${alert.severity === 'CRITICAL' ? 'text-rose-500 animate-bounce' : 'text-amber-500'}`} />
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-bold text-slate-200 text-sm">{alert.nodeName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{alert.message}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Timestamp: {alert.timestamp}</span>
              </div>
            </div>

            {!alert.acknowledged && (
              <button
                onClick={() => acknowledgeAlert(alert.id)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 rounded-lg text-xs font-medium transition-colors w-full sm:w-auto justify-center"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Acknowledge Incident</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}