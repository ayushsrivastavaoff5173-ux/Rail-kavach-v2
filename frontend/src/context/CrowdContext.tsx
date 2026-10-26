// src/context/CrowdContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CameraNode, TelemetryFrame, IncidentAlert, SimulationConfig } from '@/types/telemetry';

interface CrowdContextType {
  telemetry: TelemetryFrame;
  alerts: IncidentAlert[];
  simulation: SimulationConfig;
  updateSimulation: (config: Partial<SimulationConfig>) => void;
  acknowledgeAlert: (id: string) => void;
  isLiveWs: boolean;
  toggleWsMode: () => void;
}

const initialNodes: CameraNode[] = [
  { id: 'cam-1', name: 'Platform 1 & 2 Main Stairs', zone: 'Platform Area', status: 'ONLINE', density: 78, currentCount: 420, maxCapacity: 500, fps: 30, resolution: '1080p' },
  { id: 'cam-2', name: 'East Concourse Entry Gate', zone: 'Concourse', status: 'WARNING', density: 88, currentCount: 610, maxCapacity: 700, fps: 28, resolution: '1080p' },
  { id: 'cam-3', name: 'Foot Over Bridge (FOB-B)', zone: 'Overbridge', status: 'CRITICAL', density: 95, currentCount: 475, maxCapacity: 500, fps: 30, resolution: '4K' },
  { id: 'cam-4', name: 'Ticket Counter Plaza', zone: 'Booking Hall', status: 'ONLINE', density: 45, currentCount: 180, maxCapacity: 400, fps: 25, resolution: '1080p' },
];

const CrowdContext = createContext<CrowdContextType | undefined>(undefined);

export const CrowdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLiveWs, setIsLiveWs] = useState<boolean>(false);
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

  // Mock simulation tick engine
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
          activeAlertsCount: alerts.filter(a => !a.acknowledged).length,
          nodes: updatedNodes,
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveWs, alerts]);

  const updateSimulation = (config: Partial<SimulationConfig>) => {
    setSimulation((prev) => ({ ...prev, ...config }));
  };

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, acknowledged: true } : alert))
    );
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