'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { IncidentForm } from '@/components/admin';
import { Plus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface Incident {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  affectedServices: string[];
  startedAt: string;
  resolvedAt: string | null;
}

const SEVERITY_COLORS = {
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
  major: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  minor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

const STATUS_COLORS = {
  investigating: 'bg-red-500/10 text-red-600',
  identified: 'bg-yellow-500/10 text-yellow-600',
  monitoring: 'bg-blue-500/10 text-blue-600',
  resolved: 'bg-green-500/10 text-green-600',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminIncidentsPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/incidents?limit=50');
      if (res.ok) {
        setIncidents(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved');

  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Incident Management</h1>
          <p className="text-muted-foreground">
            Create and manage status page incidents
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Incident</DialogTitle>
              <DialogDescription>
                Report a new incident to the status page
              </DialogDescription>
            </DialogHeader>
            <IncidentForm
              onSuccess={() => {
                setCreateOpen(false);
                fetchIncidents();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Active Incidents ({activeIncidents.length})
          </h2>
          <div className="space-y-4">
            {activeIncidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onClick={() => router.push(`/admin/incidents/${incident.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Incidents */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Past Incidents ({resolvedIncidents.length})
        </h2>
        {resolvedIncidents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No resolved incidents
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {resolvedIncidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onClick={() => router.push(`/admin/incidents/${incident.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IncidentCard({
  incident,
  onClick,
}: {
  incident: Incident;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{incident.title}</CardTitle>
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className={SEVERITY_COLORS[incident.severity as keyof typeof SEVERITY_COLORS]}
            >
              {incident.severity}
            </Badge>
            <Badge
              variant="secondary"
              className={STATUS_COLORS[incident.status as keyof typeof STATUS_COLORS]}
            >
              {incident.status}
            </Badge>
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {incident.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Started: {formatDate(incident.startedAt)}</span>
          {incident.resolvedAt && (
            <span>Resolved: {formatDate(incident.resolvedAt)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
