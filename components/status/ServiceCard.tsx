'use client';

import { Check, AlertTriangle, XCircle } from 'lucide-react';
import type { ServiceHealth, ServiceStatus } from './types';

const SERVICE_LABELS: Record<string, string> = {
  api: 'API',
  database: 'Database',
  auth: 'Authentication',
  wasm: 'WASM Engine',
};

interface ServiceCardProps {
  service: ServiceHealth;
}

function StatusIcon({ status }: { status: ServiceStatus }) {
  switch (status) {
    case 'operational':
      return <Check className="h-5 w-5 text-green-500" />;
    case 'degraded':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'outage':
      return <XCircle className="h-5 w-5 text-red-500" />;
  }
}

export function ServiceCard({ service }: ServiceCardProps) {
  const label = SERVICE_LABELS[service.service] || service.service;

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <StatusIcon status={service.status} />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {service.responseTime !== undefined && (
          <span>{service.responseTime}ms</span>
        )}
        <span className="capitalize">{service.status}</span>
      </div>
    </div>
  );
}
