'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SERVICES = [
  { value: 'api', label: 'API' },
  { value: 'database', label: 'Database' },
  { value: 'auth', label: 'Authentication' },
  { value: 'wasm', label: 'WASM Engine' },
];

interface IncidentFormProps {
  incident?: {
    id: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    affectedServices: string[];
  };
  onSuccess?: () => void;
}

export function IncidentForm({ incident, onSuccess }: IncidentFormProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(incident?.title || '');
  const [description, setDescription] = useState(incident?.description || '');
  const [severity, setSeverity] = useState(incident?.severity || 'minor');
  const [status, setStatus] = useState(incident?.status || 'investigating');
  const [affectedServices, setAffectedServices] = useState<string[]>(
    incident?.affectedServices || []
  );

  const isEdit = !!incident;

  const toggleService = (service: string) => {
    setAffectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/incidents/${incident.id}` : '/api/incidents';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          severity,
          ...(isEdit && { status }),
          affectedServices,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save incident');
      }

      toast.success(isEdit ? 'Incident updated' : 'Incident created');
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief description of the incident"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed description of what's happening"
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Severity</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isEdit && (
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="identified">Identified</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Affected Services</Label>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((service) => (
            <Button
              key={service.value}
              type="button"
              variant={affectedServices.includes(service.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleService(service.value)}
            >
              {service.label}
            </Button>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEdit ? 'Update Incident' : 'Create Incident'}
      </Button>
    </form>
  );
}
