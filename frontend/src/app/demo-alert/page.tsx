// src/app/demo-alert/page.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, ShieldAlert, Shield, Users, RotateCcw, CheckCircle2, Clock } from 'lucide-react';
import { useCrowdState } from '@/hooks/useCrowdState';
import { useAudioAlert } from '@/hooks/useAudioAlert';

interface Dispatch {
  id: string;
  timestamp: string;
  nodeId: string;
  nodeName: string;
  unit: string;
  message: string;
  status: string;
}

interface DemoState {
  active: boolean;
  nodes: string[];
  remaining: number;
  dispatches: Dispatch[];
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws').replace(/^ws/, 'http').replace(/\/ws$/, '')
).replace(/\/$/, '');

const UNITS = ['Station Master', 'RPF', 'GRP Police'] as const;

export default function DemoAlertPage() {
  const { telemetry } = useCrowdState();
  const { playAnnouncement } = useAudioAlert();

  const [selected, setSelected] = useState<string[]>(['cam-2']);
  const [demo, setDemo] = useState<DemoState>({ active: false, nodes: [], remaining: 0, dispatches: [] });
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastAnnouncedRef = useRef<string>('');

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/demo/state`, { cache: 'no-store' });
      if (!r.ok) throw new Error('bad status');
      setDemo((await r.json()) as DemoState);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    void poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [poll]);

  const toggleNode = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const trigger = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/demo/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: selected }),
      });
      if (!r.ok) throw new Error('bad status');
      setOffline(false);
      await poll();
    } catch {
      setOffline(true);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    try {
      await fetch(`${API_BASE}/api/demo/clear`, { method: 'POST' });
      lastAnnouncedRef.current = '';
      await poll();
    } catch {
      setOffline(true);
    }
  };

  const nodeById = (id: string) => telemetry.nodes.find((n) => n.id === id);
  const criticalNodes = telemetry.nodes.filter((n) => demo.nodes.includes(n.id) && n.density > 90);

  // Spoken warning once per new dispatch round
  useEffect(() => {
    const newest = demo.dispatches[0];
    if (!demo.active || !newest || lastAnnouncedRef.current === newest.id) return;
    if (!lastAnnouncedRef.current || newest.unit === 'Station Master') {
      try {
        playAnnouncement(
          `Attention please. Critical crowd density at ${newest.nodeName}. Station staff and police have been alerted. Please move calmly towards the exits.`,
          `कृपया ध्यान दें। ${newest.nodeName} पर भीड़ बहुत अधिक है। स्टेशन स्टाफ और पुलिस को सूचित कर दिया गया है। कृपया शांति से निकास द्वारों की ओर बढ़ें।`
        );
      } catch {
        /* audio is optional */
      }
    }
    lastAnnouncedRef.current = newest.id;
  }, [demo, playAnnouncement]);

  const barColor = (d: number) => (d > 90 ? 'bg-rose-500' : d > 80 ? 'bg-amber-500' : 'bg-emerald-500');
  const unitEvents = (unit: string) => demo.dispatches.filter((d) => d.unit === unit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono text-slate-100 uppercase tracking-wide">Demo Alert</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Pick one or two cameras and press the button. Their crowd density rises on its own, a critical alert is raised and the
          response teams are notified.
        </p>
        <p className="text-[11px] text-amber-400/90 font-mono mt-1">
          Demo mode: notifications are shown on this screen only. No real call, SMS or message is sent to anyone.
        </p>
      </div>

      {offline && (
        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-mono">
          Backend not reachable. Start it with: uvicorn main:app --port 8000
        </div>
      )}

      {criticalNodes.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-500/50 bg-rose-950/30 text-rose-300 font-mono flex items-start space-x-3 animate-pulse">
          <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="text-xs">
            <div className="font-bold text-sm text-rose-200">
              CRITICAL: {criticalNodes.map((n) => n.name).join(' and ')} above 90% density
            </div>
            Station Master, RPF and GRP Police are being alerted for the area near the camera.
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">1. Choose camera(s)</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {telemetry.nodes.map((n) => {
            const on = selected.includes(n.id);
            return (
              <button
                key={n.id}
                onClick={() => toggleNode(n.id)}
                className={`text-left p-3 rounded-lg border font-mono transition-colors ${
                  on ? 'border-rose-500/60 bg-rose-500/10' : 'border-slate-700 bg-slate-950 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-100">{n.name}</span>
                  {on && <CheckCircle2 className="w-4 h-4 text-rose-400" />}
                </div>
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {n.currentCount}/{n.maxCapacity}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-white font-bold">{n.density}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full ${barColor(n.density)} transition-all duration-500`} style={{ width: `${n.density}%` }} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={trigger}
            disabled={busy || selected.length === 0 || offline}
            className="flex items-center space-x-2 px-5 py-2.5 bg-rose-600/30 border border-rose-500/60 text-rose-200 rounded-lg font-mono text-sm font-bold hover:bg-rose-600/40 transition-colors disabled:opacity-40"
          >
            <BellRing className="w-4 h-4" />
            <span>Trigger Demo Alert</span>
          </button>
          <button
            onClick={clear}
            disabled={offline}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg font-mono text-xs hover:bg-slate-700 transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Stop demo / back to normal</span>
          </button>
          {demo.active && (
            <span className="flex items-center space-x-1.5 text-[11px] font-mono text-amber-300">
              <Clock className="w-3.5 h-3.5" />
              <span>Demo running · ends in {demo.remaining}s</span>
            </span>
          )}
        </div>
      </div>

      {/* Response teams */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {UNITS.map((unit) => {
          const events = unitEvents(unit);
          const alerted = events.length > 0;
          return (
            <div
              key={unit}
              className={`rounded-xl border p-4 font-mono transition-colors ${
                alerted ? 'border-rose-500/50 bg-rose-950/20' : 'border-slate-800 bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className={`w-5 h-5 ${alerted ? 'text-rose-400' : 'text-slate-600'}`} />
                  <span className="font-bold text-slate-100 text-sm">{unit}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    alerted
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {alerted ? 'ALERTED' : 'STANDING BY'}
                </span>
              </div>
              <div className="mt-3 space-y-2 min-h-12">
                {alerted ? (
                  events.slice(0, 3).map((e) => (
                    <div key={e.id} className="text-[11px] text-slate-300">
                      <span className="text-slate-500">{e.timestamp}</span> · {e.message}
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-slate-500">Waiting for a critical alert.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono">
        <div className="flex items-center space-x-2 mb-3">
          <BellRing className="w-4 h-4 text-slate-400" />
          <span className="text-[11px] text-slate-400 uppercase tracking-wide">Response timeline (demo)</span>
        </div>
        {demo.dispatches.length === 0 ? (
          <div className="text-xs text-slate-500">Nothing yet. Press &quot;Trigger Demo Alert&quot;.</div>
        ) : (
          <ul className="space-y-1.5">
            {demo.dispatches.slice(0, 12).map((d) => (
              <li key={d.id} className="text-xs text-slate-300 flex items-start space-x-2">
                <span className="text-slate-500 shrink-0">{d.timestamp}</span>
                <span className="px-1.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] shrink-0">
                  {d.unit}
                </span>
                <span>{d.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
