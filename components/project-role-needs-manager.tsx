'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { ApplicationsPanel } from '@/components/applications-panel';
import { cn } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Edit2,
  Users,
  Clapperboard,
  PenTool,
  Music,
  Palette,
  Megaphone,
  Scissors,
  User,
  Camera,
  Headphones,
  MapPin,
  DollarSign,
  Briefcase,
  Check,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

export interface ProjectRoleNeed {
  id: string;
  role: string;
  description: string | null;
  location: string | null;
  isPaid: boolean;
  createdAt: string;
  _count?: {
    applications: number;
  };
}

interface ProjectRoleNeedsManagerProps {
  projectId: string;
  isOwner: boolean;
  className?: string;
}

// Role definitions with icons and colors (reused from project-roles-manager)
const ROLE_DEFINITIONS: {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { value: 'director', label: 'Director', icon: Clapperboard, color: 'text-red-500' },
  { value: 'writer', label: 'Writer', icon: PenTool, color: 'text-blue-500' },
  { value: 'producer', label: 'Producer', icon: Megaphone, color: 'text-amber-500' },
  { value: 'executive_producer', label: 'Exec. Producer', icon: Megaphone, color: 'text-amber-600' },
  { value: 'cinematographer', label: 'DP', icon: Camera, color: 'text-purple-500' },
  { value: 'editor', label: 'Editor', icon: Scissors, color: 'text-green-500' },
  { value: 'composer', label: 'Composer', icon: Music, color: 'text-pink-500' },
  { value: 'sound_designer', label: 'Sound Designer', icon: Headphones, color: 'text-cyan-500' },
  { value: 'production_designer', label: 'Production Designer', icon: Palette, color: 'text-orange-500' },
  { value: 'costume_designer', label: 'Costume Designer', icon: Palette, color: 'text-rose-500' },
  { value: 'casting_director', label: 'Casting Director', icon: Users, color: 'text-indigo-500' },
  { value: 'first_ad', label: '1st AD', icon: User, color: 'text-slate-500' },
  { value: 'line_producer', label: 'Line Producer', icon: User, color: 'text-emerald-500' },
  { value: 'actor', label: 'Actor', icon: User, color: 'text-violet-500' },
  { value: 'gaffer', label: 'Gaffer', icon: User, color: 'text-yellow-600' },
  { value: 'grip', label: 'Grip', icon: User, color: 'text-stone-500' },
  { value: 'other', label: 'Other', icon: User, color: 'text-gray-500' },
];

// Get role label from value
function getRoleLabel(roleValue: string): string {
  const def = ROLE_DEFINITIONS.find((r) => r.value === roleValue);
  return def?.label || roleValue;
}

// Get role icon from value
function getRoleIcon(roleValue: string) {
  const def = ROLE_DEFINITIONS.find((r) => r.value === roleValue);
  return def?.icon || User;
}

// Get role color from value
function getRoleColor(roleValue: string) {
  const def = ROLE_DEFINITIONS.find((r) => r.value === roleValue);
  return def?.color || 'text-gray-500';
}

export function ProjectRoleNeedsManager({
  projectId,
  isOwner,
  className,
}: ProjectRoleNeedsManagerProps) {
  const [roleNeeds, setRoleNeeds] = useState<ProjectRoleNeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    role: '',
    description: '',
    location: '',
    isPaid: false,
  });

  // Applications panel state
  const [applicationsPanelOpen, setApplicationsPanelOpen] = useState(false);
  const [selectedRoleNeed, setSelectedRoleNeed] = useState<ProjectRoleNeed | null>(null);

  // Fetch role needs
  const fetchRoleNeeds = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/projects/${projectId}/role-needs`);
      if (res.ok) {
        const data = await res.json();
        setRoleNeeds(data);
      }
    } catch (error) {
      console.error('Failed to fetch role needs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRoleNeeds();
  }, [fetchRoleNeeds]);

  const resetForm = () => {
    setFormData({ role: '', description: '', location: '', isPaid: false });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.role) {
      toast.error('Please select a role');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        // Update existing
        const response = await fetch(`/api/projects/${projectId}/role-needs/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update');
        }

        const updated = await response.json();
        setRoleNeeds(roleNeeds.map((r) => (r.id === editingId ? updated : r)));
        toast.success('Role need updated');
      } else {
        // Create new
        const response = await fetch(`/api/projects/${projectId}/role-needs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to add');
        }

        const created = await response.json();
        setRoleNeeds([created, ...roleNeeds]);
        toast.success('Role need added');
      }
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/role-needs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      setRoleNeeds(roleNeeds.filter((r) => r.id !== id));
      toast.success('Role need removed');
    } catch {
      toast.error('Failed to remove role need');
    }
  };

  const startEditing = (roleNeed: ProjectRoleNeed) => {
    setFormData({
      role: roleNeed.role,
      description: roleNeed.description || '',
      location: roleNeed.location || '',
      isPaid: roleNeed.isPaid,
    });
    setEditingId(roleNeed.id);
    setIsAdding(false);
  };

  const showForm = isAdding || editingId !== null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Open Roles
          </h3>
          <p className="text-sm text-muted-foreground">
            {roleNeeds.length} position{roleNeeds.length !== 1 ? 's' : ''} available
          </p>
        </div>
        {isOwner && !showForm && (
          <Button size="sm" onClick={() => setIsAdding(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Role
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && isOwner && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 sm:p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_DEFINITIONS.map((role) => {
                  const Icon = role.icon;
                  return (
                    <SelectItem key={role.value} value={role.value}>
                      <span className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', role.color)} />
                        {role.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Input
              placeholder="Location (e.g., Los Angeles, Remote)"
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              className="flex-1"
            />
          </div>

          <Textarea
            placeholder="Description (optional) - What are you looking for? Any requirements?"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isPaid"
                checked={formData.isPaid}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isPaid: checked === true }))
                }
              />
              <Label htmlFor="isPaid" className="text-sm cursor-pointer">
                This is a paid position
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.role}
              >
                {isSubmitting ? (
                  'Saving...'
                ) : editingId ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Update
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add
                  </>
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Role Needs List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : roleNeeds.length === 0 && !showForm ? (
        isOwner ? (
          <EmptyState
            icon={<Briefcase className="h-8 w-8 text-muted-foreground" />}
            title="No open roles"
            description="Post roles you're looking to fill for this project"
            action={{
              label: 'Add Role',
              onClick: () => setIsAdding(true),
              icon: <Plus className="h-4 w-4" />,
            }}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No open roles at the moment</p>
          </div>
        )
      ) : roleNeeds.length > 0 ? (
        <div className="border border-border rounded-lg divide-y divide-border">
          {roleNeeds.map((roleNeed) => {
            const Icon = getRoleIcon(roleNeed.role);
            const colorClass = getRoleColor(roleNeed.role);
            return (
              <div
                key={roleNeed.id}
                className="group px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn('mt-0.5 p-2 rounded-lg bg-muted', colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{getRoleLabel(roleNeed.role)}</span>
                        {roleNeed.isPaid && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <DollarSign className="h-3 w-3" />
                            Paid
                          </Badge>
                        )}
                        {roleNeed.location && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <MapPin className="h-3 w-3" />
                            {roleNeed.location}
                          </Badge>
                        )}
                        {isOwner && (roleNeed._count?.applications ?? 0) > 0 && (
                          <Badge
                            variant="default"
                            className="text-xs gap-1 cursor-pointer"
                            onClick={() => {
                              setSelectedRoleNeed(roleNeed);
                              setApplicationsPanelOpen(true);
                            }}
                          >
                            <UserCheck className="h-3 w-3" />
                            {roleNeed._count?.applications} applicant{roleNeed._count?.applications !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      {roleNeed.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {roleNeed.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(roleNeed._count?.applications ?? 0) > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedRoleNeed(roleNeed);
                            setApplicationsPanelOpen(true);
                          }}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => startEditing(roleNeed)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(roleNeed.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Applications Panel */}
      {isOwner && (
        <ApplicationsPanel
          roleNeed={selectedRoleNeed ? {
            ...selectedRoleNeed,
            projectId,
          } : null}
          open={applicationsPanelOpen}
          onOpenChange={setApplicationsPanelOpen}
          onApplicationUpdated={fetchRoleNeeds}
        />
      )}
    </div>
  );
}
