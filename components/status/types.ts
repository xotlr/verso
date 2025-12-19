export type ServiceStatus = 'operational' | 'degraded' | 'outage';

export interface ServiceHealth {
  service: string;
  status: ServiceStatus;
  responseTime?: number;
  error?: string;
  checkedAt: string;
}

export interface HealthData {
  status: ServiceStatus;
  services: ServiceHealth[];
  timestamp: string;
}

export interface UptimeData {
  service: string;
  date: string;
  uptimePercent: number;
  downtimeMinutes: number;
}

export interface HistoryData {
  history: Record<string, UptimeData[]>;
  overallUptime: Record<string, number>;
  days: number;
  startDate: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'critical' | 'major' | 'minor';
  affectedServices: string[];
  startedAt: string;
  resolvedAt: string | null;
  updates: IncidentUpdate[];
}

export interface IncidentUpdate {
  id: string;
  message: string;
  status: string;
  createdAt: string;
}
