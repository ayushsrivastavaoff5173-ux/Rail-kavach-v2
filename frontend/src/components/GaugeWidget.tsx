// src/components/GaugeWidget.tsx
'use client';

import React from 'react';
import { Gauge } from 'lucide-react';

interface GaugeWidgetProps {
  title: string;
  value: number; // 0 - 100
  subtitle: string;
}

export const GaugeWidget: React.FC<GaugeWidgetProps> = ({ title, value, subtitle }) => {
  const getColor = (val: number) => {
    if (val > 90) return 'text-rose-500 stroke-rose-500';
    if (val > 75) return 'text-amber-500 stroke-amber-500';
    return 'text-emerald-500 stroke-emerald-500';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        <Gauge className="w-4 h-4 text-slate-500" />
      </div>

      <div className="flex items-center justify-center my-2">
        <div className="relative flex items-center justify-center">
          <span className={`text-3xl font-mono font-bold ${getColor(value).split(' ')[0]}`}>
            {value}%
          </span>
        </div>
      </div>

      <div className="text-center font-mono text-[11px] text-slate-500 border-t border-slate-800/80 pt-2 mt-1">
        {subtitle}
      </div>
    </div>
  );
};