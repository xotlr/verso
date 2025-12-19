'use client';

import { useEffect, useState } from 'react';
import { Check, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceCard } from './ServiceCard';
import { UptimeChart } from './UptimeChart';
import { IncidentList } from './IncidentList';
import type { HealthData, HistoryData, Incident, ServiceStatus } from './types';

const SERVICE_LABELS: Record<string, string> = {
  api: 'API',
  database: 'Database',
  auth: 'Authentication',
  wasm: 'WASM Engine',
};

function OverallStatusBadge({ status }: { status: ServiceStatus }) {
  const config = {
    operational: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      text: 'text-green-600',
      label: 'All Systems Operational',
      icon: Check,
    },
    degraded: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      text: 'text-yellow-600',
      label: 'Degraded Performance',
      icon: AlertTriangle,
    },
    outage: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-600',
      label: 'Service Outage',
      icon: XCircle,
    },
  }[status];

  const Icon = config.icon;

  return (
    <div className={`p-6 rounded-xl border ${config.bg} ${config.border}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 ${config.text}`} />
          <div>
            <h2 className="text-xl font-medium">{config.label}</h2>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium border ${config.bg} ${config.text} ${config.border}`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
    </div>
  );
}

export function StatusContent() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [healthRes, historyRes, incidentsRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/health/history'),
        fetch('/api/incidents').catch(() => ({ ok: false })),
      ]);

      if (healthRes.ok) {
        setHealth(await healthRes.json());
      }

      if (historyRes.ok) {
        setHistory(await historyRes.json());
      }

      if (incidentsRes.ok) {
        setIncidents(await (incidentsRes as Response).json());
      }
    } catch (error) {
      console.error('Failed to fetch status data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="py-24 sm:py-32">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-4">
            <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            <p className="text-muted-foreground">Loading status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-24 sm:py-32">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium">
            System Status
          </h1>
          <p className="text-muted-foreground">
            Current status of Verso services
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Overall Status */}
        <div className="mb-8">
          <OverallStatusBadge status={health?.status || 'operational'} />
        </div>

        {/* Services List */}
        <div className="rounded-xl border overflow-hidden mb-12">
          <div className="bg-muted/30 px-6 py-3 border-b">
            <h3 className="font-medium">Services</h3>
          </div>
          <div className="divide-y">
            {health?.services.map((service) => (
              <ServiceCard key={service.service} service={service} />
            ))}
          </div>
        </div>

        {/* Uptime History */}
        {history && (
          <div className="rounded-xl border overflow-hidden mb-12">
            <div className="bg-muted/30 px-6 py-3 border-b">
              <h3 className="font-medium">90-Day Uptime</h3>
            </div>
            <div className="p-6 space-y-6">
              {Object.entries(history.overallUptime).map(([service, percent]) => (
                <UptimeChart
                  key={service}
                  label={SERVICE_LABELS[service] || service}
                  data={history.history[service] || []}
                  overallPercent={percent}
                />
              ))}
            </div>
          </div>
        )}

        {/* Incidents */}
        <IncidentList incidents={incidents} />

        {/* Subscribe */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Subscribe to status updates via{' '}
            <a
              href="mailto:status@verso.ink"
              className="text-primary hover:underline"
            >
              email
            </a>{' '}
            or follow{' '}
            <a
              href="https://twitter.com/versoink"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              @versoink
            </a>{' '}
            on Twitter.
          </p>
        </div>
      </div>
    </div>
  );
}
