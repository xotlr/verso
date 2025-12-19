'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { IncidentForm, IncidentUpdateForm } from '@/components/admin';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface IncidentUpdate {
  id: string;
  message: string;
  status: string;
  createdAt: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  affectedServices: string[];
  startedAt: string;
  resolvedAt: string | null;
  updates: IncidentUpdate[];
}

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

export default function AdminIncidentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchIncident = async () => {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      if (res.ok) {
        setIncident(await res.json());
      } else if (res.status === 404) {
        router.push('/admin/incidents');
      }
    } catch (err) {
      console.error('Failed to fetch incident:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/incidents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Incident deleted');
        router.push('/admin/incidents');
      } else {
        throw new Error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete incident');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container max-w-4xl py-8">
        <p className="text-muted-foreground">Incident not found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/incidents')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Incidents
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Incident</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this incident and all its updates.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Edit Incident</CardTitle>
            <CardDescription>Update incident details</CardDescription>
          </CardHeader>
          <CardContent>
            <IncidentForm incident={incident} onSuccess={fetchIncident} />
          </CardContent>
        </Card>

        {/* Add Update */}
        <Card>
          <CardHeader>
            <CardTitle>Add Update</CardTitle>
            <CardDescription>Post a status update</CardDescription>
          </CardHeader>
          <CardContent>
            <IncidentUpdateForm
              incidentId={incident.id}
              currentStatus={incident.status}
              onSuccess={fetchIncident}
            />
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>
            Started {formatDate(incident.startedAt)}
            {incident.resolvedAt && ` - Resolved ${formatDate(incident.resolvedAt)}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incident.updates.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No updates yet
            </p>
          ) : (
            <div className="space-y-4">
              {incident.updates.map((update, i) => (
                <div key={update.id}>
                  {i > 0 && <Separator className="my-4" />}
                  <div className="flex items-start gap-4">
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[update.status as keyof typeof STATUS_COLORS]}
                    >
                      {update.status}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm">{update.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(update.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
