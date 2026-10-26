// src/types/telemetry.ts

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CameraNode {
  id: string;
  name: string;
  zone: string;
  status: 'ONLINE' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  density: number; // Percentage (0 - 100)
  currentCount: number;
  maxCapacity: number;
  fps: number;
  resolution: string;
  streamUrl?: string;
}

export interface TelemetryFrame {
  timestamp: string;
  totalCrowdCount: number;
  averageDensity: number;
  activeAlertsCount: number;
  nodes: CameraNode[];
}

export interface IncidentAlert {
  id: string;
  timestamp: string;
  nodeId: string;
  nodeName: string;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
}

export interface SimulationConfig {
  inflowRate: number; // People per minute
  outflowRate: number;
  eventSpeed: number; // Multiplier
  weatherCondition: 'CLEAR' | 'RAIN' | 'HEAVY_RUSH';
}