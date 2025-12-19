export type ServiceStatus = 'operational' | 'degraded' | 'outage';

export type ServiceName = 'api' | 'database' | 'auth' | 'wasm';

export interface HealthCheckResult {
  service: ServiceName;
  status: ServiceStatus;
  responseTime?: number; // milliseconds
  error?: string;
  checkedAt: string; // ISO timestamp
}

export interface OverallHealth {
  status: ServiceStatus;
  services: HealthCheckResult[];
  timestamp: string;
}

export interface UptimeData {
  service: ServiceName;
  date: string; // YYYY-MM-DD
  uptimePercent: number;
  downtimeMinutes: number;
}

export interface IncidentSeverity {
  critical: 'critical';
  major: 'major';
  minor: 'minor';
}

export interface IncidentStatus {
  investigating: 'investigating';
  identified: 'identified';
  monitoring: 'monitoring';
  resolved: 'resolved';
}

export const SERVICES: ServiceName[] = ['api', 'database', 'auth', 'wasm'];

export const SERVICE_LABELS: Record<ServiceName, string> = {
  api: 'API',
  database: 'Database',
  auth: 'Authentication',
  wasm: 'WASM Engine',
};

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded Performance',
  outage: 'Outage',
};
