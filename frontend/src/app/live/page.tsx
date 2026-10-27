// src/app/live/page.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Users, ShieldAlert, Activity } from 'lucide-react';
import { useAudioAlert } from '@/hooks/useAudioAlert';

type Box = [number, number, number, number, number]; // x1, y1, x2, y2 (0..1), confidence
type Phase = 'idle' | 'starting' | 'running' | 'error';

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws').replace(/^ws/, 'http').replace(/\/ws$/, '')
).replace(/\/$/, '');

const SEND_EVERY_MS = 250; // at most ~4 frames per second go to the backend

export default function LiveDetectionPage() {
  const { playAnnouncement } = useAudioAlert();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const grabRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);
  const boxesRef = useRef<Box[]>([]);
  const failuresRef = useRef(0);
  const lastAnnounceRef = useRef(0);

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [gotFirstResult, setGotFirstResult] = useState(false);
  const [limit, setLimit] = useState(6); // number of people that equals 100% density
  const [ratio, setRatio] = useState(16 / 9);

  const density = Math.min(100, Math.round((count / Math.max(1, limit)) * 100));
  const status: 'SAFE' | 'WARNING' | 'CRITICAL' = density > 90 ? 'CRITICAL' : density > 80 ? 'WARNING' : 'SAFE';

  const draw = useCallback(() => {
    const c = overlayRef.current;
    const v = videoRef.current;
    if (!c || !v) return;
    const w = v.clientWidth;
    const h = v.clientHeight;
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#34d399';
    ctx.font = '11px monospace';
    for (const [x1, y1, x2, y2, conf] of boxesRef.current) {
      const x = x1 * w;
      const y = y1 * h;
      ctx.strokeRect(x, y, (x2 - x1) * w, (y2 - y1) * h);
      const label = `person ${Math.round(conf * 100)}%`;
      ctx.fillStyle = '#059669';
      ctx.fillRect(x, Math.max(0, y - 14), ctx.measureText(label).width + 8, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 4, Math.max(11, y - 3));
    }
  }, []);

  const loop = useCallback(async () => {
    const v = videoRef.current;
    while (runningRef.current) {
      const t0 = performance.now();
      try {
        if (v && v.videoWidth > 0) {
          const scale = Math.min(1, 640 / v.videoWidth);
          const g = grabRef.current ?? (grabRef.current = document.createElement('canvas'));
          g.width = Math.round(v.videoWidth * scale);
          g.height = Math.round(v.videoHeight * scale);
          g.getContext('2d')?.drawImage(v, 0, 0, g.width, g.height);
          const blob: Blob | null = await new Promise((res) => g.toBlob(res, 'image/jpeg', 0.7));
          if (blob && runningRef.current) {
            const r = await fetch(`${API_BASE}/api/detect`, {
              method: 'POST',
              headers: { 'Content-Type': 'image/jpeg' },
              body: blob,
            });
            if (!r.ok) throw new Error(`backend returned ${r.status}`);
            const d = await r.json();
            boxesRef.current = d.boxes as Box[];
            failuresRef.current = 0;
            setError(null);
            setGotFirstResult(true);
            setCount(d.count as number);
            setLatency(Math.round(performance.now() - t0));
            draw();
          }
        }
      } catch {
        if (!runningRef.current) break;
        failuresRef.current += 1;
        if (failuresRef.current >= 3) {
          setError('Backend not reachable. Start it with: uvicorn main:app --port 8000');
        }
      }
      const wait = Math.max(0, SEND_EVERY_MS - (performance.now() - t0));
      await new Promise((r) => setTimeout(r, wait));
    }
  }, [draw]);

  const stop = useCallback(() => {
    runningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    boxesRef.current = [];
    draw();
    setCount(0);
    setLatency(null);
    setGotFirstResult(false);
    setPhase('idle');
  }, [draw]);

  const start = async () => {
    setError(null);
    setGotFirstResult(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase('error');
      setError('This browser cannot open the camera here. Use Chrome on http://localhost:3000.');
      return;
    }
    setPhase('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
      }
      failuresRef.current = 0;
      runningRef.current = true;
      setPhase('running');
      void loop();
    } catch (e) {
      setPhase('error');
      const name = e instanceof Error ? e.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow the camera in the browser address bar and try again.'
          : name === 'NotFoundError'
            ? 'No camera found on this device.'
            : 'Could not start the camera.'
      );
    }
  };

  // Release the camera when leaving the page
  useEffect(() => {
    return () => {
      runningRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Spoken warning when the live crowd turns critical (at most once every 20 seconds)
  useEffect(() => {
    if (phase !== 'running' || status !== 'CRITICAL') return;
    const now = Date.now();
    if (now - lastAnnounceRef.current < 20000) return;
    lastAnnounceRef.current = now;
    try {
      playAnnouncement(
        'Attention please. High crowd density detected near the camera. Please move towards exit routes.',
        'कृपया ध्यान दें। कैमरे के पास भीड़ अधिक है। कृपया निकास द्वारों की ओर बढ़ें।'
      );
    } catch {
      /* audio is optional */
    }
  }, [phase, status, playAnnouncement]);

  const statusStyle =
    status === 'CRITICAL'
      ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
      : status === 'WARNING'
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
  const barStyle = status === 'CRITICAL' ? 'bg-rose-500' : status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500';
  const running = phase === 'running';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono text-slate-100 uppercase tracking-wide">Live Detection</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Real-time person counting from this device&apos;s camera using YOLOv8. People are counted only: no faces are
          recognised and no frames are saved.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-mono">
          {error}
        </div>
      )}

      {running && status === 'CRITICAL' && (
        <div className="p-4 rounded-xl border border-rose-500/50 bg-rose-950/30 text-rose-300 font-mono flex items-start space-x-3 animate-pulse">
          <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="text-xs">
            <div className="font-bold text-sm text-rose-200">CRITICAL: crowd density above 90%</div>
            Recommended actions: close the gate, make a PA announcement, send RPF to the spot, alert the Station Master.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera view */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="relative bg-slate-950 w-full" style={{ aspectRatio: ratio }}>
            <video
              ref={videoRef}
              playsInline
              muted
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
              }}
              className={`absolute inset-0 w-full h-full ${running ? '' : 'invisible'}`}
            />
            <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            {!running && (
              <div className="absolute inset-0 flex items-center justify-center text-center p-6">
                <div>
                  <Camera className="w-12 h-12 mx-auto text-slate-700 mb-3" />
                  <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                    {phase === 'starting' ? 'Starting camera…' : 'Camera is off'}
                  </span>
                </div>
              </div>
            )}
            {running && !gotFirstResult && !error && (
              <div className="absolute top-3 left-3 z-10 text-[11px] font-mono bg-slate-900/80 border border-slate-700 text-slate-300 px-2 py-1 rounded">
                Loading detection model…
              </div>
            )}
            {running && (
              <div className="absolute bottom-3 left-3 z-10 flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400">People:</span>
                <strong className="text-white">{count}</strong>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950/80 border-t border-slate-800 text-xs font-mono">
            <span className="text-slate-500 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>{latency !== null ? `Detection round-trip: ${latency} ms` : 'Waiting for detection'}</span>
            </span>
            {running ? (
              <button
                onClick={stop}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <CameraOff className="w-4 h-4" />
                <span>Stop camera</span>
              </button>
            ) : (
              <button
                onClick={start}
                disabled={phase === 'starting'}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-lg hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>Start live detection</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono">
            <div className="text-[11px] text-slate-400 uppercase tracking-wide">People in view</div>
            <div className="text-4xl font-bold text-white mt-1">{count}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 uppercase tracking-wide">Crowd density</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle}`}>
                {running ? status : 'OFF'}
              </span>
            </div>
            <div className="text-4xl font-bold text-white mt-1">{running ? `${density}%` : '--'}</div>
            <div className="h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div className={`h-full ${barStyle} transition-all duration-300`} style={{ width: `${running ? density : 0}%` }} />
            </div>
            <div className="text-[10px] text-slate-500 mt-2">Warning above 80%, critical above 90%.</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono">
            <label htmlFor="limit" className="text-[11px] text-slate-400 uppercase tracking-wide">
              Safe limit (people = 100%)
            </label>
            <input
              id="limit"
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
            <div className="text-[10px] text-slate-500 mt-2">
              Demo setting. For a real platform this comes from its area and safe capacity.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
