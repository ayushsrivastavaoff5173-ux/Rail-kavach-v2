// src/context/CrowdContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { CameraNode, TelemetryFrame, IncidentAlert, SimulationConfig } from '@/types/telemetry';

export type WsStatus = 'off' | 'connecting' | 'connected' | 'error';

interface CrowdContextType {
  telemetry: TelemetryFrame;
  alerts: IncidentAlert[];
  simulation: SimulationConfig;
  updateSimulation: (config: Partial<SimulationConfig>) => void;
  acknowledgeAlert: (id: string) => void;
  isLiveWs: boolean;
  toggleWsMode: () => void;
  wsStatus: WsStatus;
  setScenario: (name: 'normal' | 'moderate' | 'surge' | 'auto') => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';
const AUTO_LIVE = process.env.NEXT_PUBLIC_AUTO_LIVE === 'true';

const initialNodes: CameraNode[] = [
  { id: 'cam-1', name: 'Platform 1 & 2 Main Stairs', zone: 'Platform Area', status: 'ONLINE', density: 78, currentCount: 420, maxCapacity: 500, fps: 30, resolution: '1080p' },
  { id: 'cam-2', name: 'East Concourse Entry Gate', zone: 'Concourse', status: 'WARNING', density: 88, currentCount: 610, maxCapacity: 700, fps: 28, resolution: '1080p' },
  { id: 'cam-3', name: 'Foot Over Bridge (FOB-B)', zone: 'Overbridge', status: 'CRITICAL', density: 95, currentCount: 475, maxCapacity: 500, fps: 30, resolution: '4K' },
  { id: 'cam-4', name: 'Ticket Counter Plaza', zone: 'Booking Hall', status: 'ONLINE', density: 45, currentCount: 180, maxCapacity: 400, fps: 25, resolution: '1080p' },
];

const CrowdContext = createContext<CrowdContextType | undefined>(undefined);

export const CrowdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLiveWs, setIsLiveWs] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>('off');
  const [simulation, setSimulation] = useState<SimulationConfig>({
    inflowRate: 120,
    outflowRate: 100,
    eventSpeed: 1,
    weatherCondition: 'CLEAR',
  });

  const [telemetry, setTelemetry] = useState<TelemetryFrame>({
    timestamp: '10:45:00 AM', // <-- Static initial string to avoid prerender unstable value error
    totalCrowdCount: 1685,
    averageDensity: 76.5,
    activeAlertsCount: 2,
    nodes: initialNodes,
  });

  const [alerts, setAlerts] = useState<IncidentAlert[]>([
    {
      id: 'alt-1',
      timestamp: '10:45:00 AM',
      nodeId: 'cam-3',
      nodeName: 'Foot Over Bridge (FOB-B)',
      severity: 'CRITICAL',
      message: 'Crowd density exceeded 95% threshold. Stampede risk high.',
      acknowledged: false,
    },
    {
      id: 'alt-2',
      timestamp: '10:41:00 AM',
      nodeId: 'cam-2',
      nodeName: 'East Concourse Entry Gate',
      severity: 'HIGH',
      message: 'Queuing congestion building up rapidly near turnstiles.',
      acknowledged: false,
    },
  ]);

  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;
  const wsRef = useRef<WebSocket | null>(null);

  const send = useCallback((payload: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }, []);

  // Optional: start in live mode when NEXT_PUBLIC_AUTO_LIVE=true (set after mount, so server and client render the same)
  useEffect(() => {
    if (AUTO_LIVE) setIsLiveWs(true);
  }, []);

  // ---- Live mode: real WebSocket to the FastAPI backend, with automatic fallback to mock ----
  useEffect(() => {
    if (!isLiveWs) {
      setWsStatus('off');
      return;
    }

    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const connect = () => {
      if (closed) return;
      setWsStatus('connecting');
      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        setWsStatus('error');
        setIsLiveWs(false); // fall back to mock
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        setWsStatus('connected');
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'telemetry') {
            setTelemetry(msg.data as TelemetryFrame);
          } else if (msg.type === 'alert') {
            setAlerts((prev) => [msg.data as IncidentAlert, ...prev.filter((a) => a.id !== msg.data.id)].slice(0, 60));
          } else if (msg.type === 'state') {
            if (msg.data.frame) setTelemetry(msg.data.frame as TelemetryFrame);
            if (Array.isArray(msg.data.alerts)) setAlerts(msg.data.alerts as IncidentAlert[]);
            if (msg.data.simulation) setSimulation(msg.data.simulation as SimulationConfig);
          }
        } catch {
          /* ignore malformed message */
        }
      };

      ws.onerror = () => setWsStatus('error');

      ws.onclose = () => {
        if (closed) return;
        attempts += 1;
        if (attempts >= 3) {
          // backend not reachable: go back to the built-in mock so the dashboard keeps working
          setWsStatus('error');
          setIsLiveWs(false);
          return;
        }
        retry = setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [isLiveWs]);

  // ---- Mock mode (also the fallback): simulation runs inside the browser ----
  useEffect(() => {
    if (isLiveWs) return;

    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const updatedNodes = prev.nodes.map((node) => {
          const fluctuation = Math.floor(Math.random() * 9) - 4; // -4 to +4
          const newDensity = Math.min(100, Math.max(20, node.density + fluctuation));
          const newCount = Math.round((newDensity / 100) * node.maxCapacity);
          let status: CameraNode['status'] = 'ONLINE';
          if (newDensity > 90) status = 'CRITICAL';
          else if (newDensity > 80) status = 'WARNING';

          return {
            ...node,
            density: newDensity,
            currentCount: newCount,
            status,
          };
        });

        const totalCount = updatedNodes.reduce((acc, curr) => acc + curr.currentCount, 0);
        const avgDens = Math.round(updatedNodes.reduce((acc, curr) => acc + curr.density, 0) / updatedNodes.length);

        return {
          timestamp: new Date().toLocaleTimeString(),
          totalCrowdCount: totalCount,
          averageDensity: avgDens,
          activeAlertsCount: alertsRef.current.filter((a) => !a.acknowledged).length,
          nodes: updatedNodes,
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveWs]);

  const updateSimulation = (config: Partial<SimulationConfig>) => {
    setSimulation((prev) => ({ ...prev, ...config }));
    send({ type: 'simulation', data: config });
  };

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, acknowledged: true } : alert)));
    send({ type: 'ack', id });
  };

  const setScenario = (name: 'normal' | 'moderate' | 'surge' | 'auto') => {
    send({ type: 'scenario', name });
  };

  const toggleWsMode = () => {
    setIsLiveWs((prev) => !prev);
  };

  return (
    <CrowdContext.Provider
      value={{
        telemetry,
        alerts,
        simulation,
        updateSimulation,
        acknowledgeAlert,
        isLiveWs,
        toggleWsMode,
        wsStatus,
        setScenario,
      }}
    >
      {children}
    </CrowdContext.Provider>
  );
};

export const useCrowd = () => {
  const context = useContext(CrowdContext);
  if (!context) {
    throw new Error('useCrowd must be used within a CrowdProvider');
  }
  return context;
};
