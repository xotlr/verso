'use client';

import { AlertTriangle, CheckCircle, Search, Eye } from 'lucide-react';
import type { Incident } from './types';

interface IncidentListProps {
  incidents: Incident[];
}

const STATUS_ICONS = {
  investigating: Search,
  identified: Eye,
  monitoring: AlertTriangle,
  resolved: CheckCircle,
};

const STATUS_COLORS = {
  investigating: 'text-red-500 border-red-500',
  identified: 'text-yellow-500 border-yellow-500',
  monitoring: 'text-blue-500 border-blue-500',
  resolved: 'text-green-500 border-green-500',
};

const SEVERITY_BADGES = {
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
  major: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  minor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function IncidentList({ incidents }: IncidentListProps) {
  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved');

  if (incidents.length === 0) {
    return (
      <div className="rounded-xl border overflow-hidden">
        <div className="bg-muted/30 px-6 py-3 border-b">
          <h3 className="font-medium">Incidents</h3>
        </div>
        <div className="p-6">
          <p className="text-muted-foreground text-center py-8">
            No incidents reported in the last 90 days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div className="rounded-xl border border-yellow-500/30 overflow-hidden bg-yellow-500/5">
          <div className="bg-yellow-500/10 px-6 py-3 border-b border-yellow-500/20">
            <h3 className="font-medium text-yellow-700 dark:text-yellow-400">
              Active Incidents ({activeIncidents.length})
            </h3>
          </div>
          <div className="divide-y divide-yellow-500/20">
            {activeIncidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Incidents */}
      {resolvedIncidents.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-6 py-3 border-b">
            <h3 className="font-medium">Past Incidents</h3>
          </div>
          <div className="divide-y">
            {resolvedIncidents.slice(0, 10).map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  const Icon = STATUS_ICONS[incident.status];
  const colorClass = STATUS_COLORS[incident.status];

  return (
    <div className="p-6">
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-medium">{incident.title}</h4>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_BADGES[incident.severity]}`}
            >
              {incident.severity}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {incident.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Started: {formatDate(incident.startedAt)}</span>
            {incident.resolvedAt && (
              <span>Resolved: {formatDate(incident.resolvedAt)}</span>
            )}
          </div>

          {/* Timeline */}
          {incident.updates.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 border-muted space-y-3">
              {incident.updates.map((update) => (
                <div key={update.id} className="text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="capitalize">{update.status}</span>
                    <span>-</span>
                    <span>{formatDate(update.createdAt)}</span>
                  </div>
                  <p>{update.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
