'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LocationInput } from '@/components/ui/location-input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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

// Role definitions with icons
const ROLE_DEFINITIONS: {
  value: string;
  label: string;
  icon: LucideIcon;
}[] = [
  // Creative
  { value: 'director', label: 'Director', icon: Clapperboard },
  { value: 'writer', label: 'Writer', icon: PenTool },
  { value: 'producer', label: 'Producer', icon: Megaphone },
  { value: 'executive_producer', label: 'Exec. Producer', icon: Megaphone },
  // Camera
  { value: 'dop', label: 'DOP', icon: Camera },
  { value: 'camera_operator', label: 'Camera Op', icon: Camera },
  { value: 'first_ac', label: '1st AC', icon: Camera },
  // Post
  { value: 'editor', label: 'Editor', icon: Scissors },
  { value: 'colorist', label: 'Colorist', icon: Palette },
  { value: 'vfx_supervisor', label: 'VFX Supervisor', icon: Palette },
  // Sound
  { value: 'composer', label: 'Composer', icon: Music },
  { value: 'sound_designer', label: 'Sound Designer', icon: Headphones },
  // Art/Design
  { value: 'production_designer', label: 'Production Designer', icon: Palette },
  { value: 'costume_designer', label: 'Costume Designer', icon: Palette },
  { value: 'makeup_artist', label: 'Makeup Artist', icon: User },
  // Production
  { value: 'line_producer', label: 'Line Producer', icon: User },
  { value: 'upm', label: 'UPM', icon: User },
  { value: 'first_ad', label: '1st AD', icon: User },
  { value: 'second_ad', label: '2nd AD', icon: User },
  { value: 'script_supervisor', label: 'Script Supervisor', icon: PenTool },
  // Grip/Electric
  { value: 'gaffer', label: 'Gaffer', icon: User },
  { value: 'key_grip', label: 'Key Grip', icon: User },
  // Talent
  { value: 'casting_director', label: 'Casting Director', icon: Users },
  { value: 'stunt_coordinator', label: 'Stunt Coordinator', icon: User },
  { value: 'actor', label: 'Actor', icon: User },
];

// Legacy role value mappings (old -> new)
const LEGACY_ROLE_MAP: Record<string, string> = {
  cinematographer: 'dop',
};

// Normalize role value (handles legacy mappings)
function normalizeRoleValue(roleValue: string): string {
  return LEGACY_ROLE_MAP[roleValue] || roleValue;
}

// Get role label from value
function getRoleLabel(roleValue: string): string {
  const normalized = normalizeRoleValue(roleValue);
  const def = ROLE_DEFINITIONS.find((r) => r.value === normalized);
  return def?.label || roleValue;
}

// Get role icon from value
function getRoleIcon(roleValue: string) {
  const normalized = normalizeRoleValue(roleValue);
  const def = ROLE_DEFINITIONS.find((r) => r.value === normalized);
  return def?.icon || User;
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

  // Role suggestions state
  const [roleInput, setRoleInput] = useState('');
  const [roleSuggestions, setRoleSuggestions] = useState<typeof ROLE_DEFINITIONS>([]);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const roleInputRef = useRef<HTMLInputElement>(null);
  const roleSuggestionsRef = useRef<HTMLDivElement>(null);

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

  // Filter role suggestions as user types
  useEffect(() => {
    if (roleInput.trim()) {
      const filtered = ROLE_DEFINITIONS.filter(r =>
        r.label.toLowerCase().includes(roleInput.toLowerCase()) ||
        r.value.toLowerCase().includes(roleInput.toLowerCase())
      );
      setRoleSuggestions(filtered);
      setShowRoleSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(0);
    } else {
      // Show all roles when input is empty (shown on focus)
      setRoleSuggestions(ROLE_DEFINITIONS);
      setSelectedSuggestionIndex(0);
    }
  }, [roleInput]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleSuggestionsRef.current && !roleSuggestionsRef.current.contains(e.target as Node)) {
        setShowRoleSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setFormData({ role: '', description: '', location: '', isPaid: false });
    setRoleInput('');
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
    setRoleInput(getRoleLabel(roleNeed.role));
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
            {/* Role input with auto-suggestions */}
            <div className="relative w-full sm:w-[200px]" ref={roleSuggestionsRef}>
              <Input
                ref={roleInputRef}
                placeholder="Type role..."
                value={roleInput}
                onChange={(e) => {
                  setRoleInput(e.target.value);
                  setFormData((prev) => ({ ...prev, role: e.target.value.toLowerCase().replace(/\s+/g, '_') }));
                }}
                onKeyDown={(e) => {
                  if (showRoleSuggestions && roleSuggestions.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedSuggestionIndex((prev) =>
                        prev < roleSuggestions.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedSuggestionIndex((prev) =>
                        prev > 0 ? prev - 1 : roleSuggestions.length - 1
                      );
                    } else if (e.key === 'Tab' || e.key === 'Enter') {
                      e.preventDefault();
                      const suggestion = roleSuggestions[selectedSuggestionIndex];
                      setRoleInput(suggestion.label);
                      setFormData((prev) => ({ ...prev, role: suggestion.value }));
                      setShowRoleSuggestions(false);
                    }
                  }
                  if (e.key === 'Escape') {
                    setShowRoleSuggestions(false);
                  }
                }}
                onFocus={() => {
                  // Always show suggestions on focus
                  setShowRoleSuggestions(true);
                }}
                autoFocus
              />
              {/* Role suggestions dropdown */}
              {showRoleSuggestions && roleSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[200px] overflow-auto">
                  {roleSuggestions.map((role, index) => {
                    const Icon = role.icon;
                    const isSelected = index === selectedSuggestionIndex;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 transition-colors text-left text-sm",
                          isSelected ? "bg-accent" : "hover:bg-muted"
                        )}
                        onClick={() => {
                          setRoleInput(role.label);
                          setFormData((prev) => ({ ...prev, role: role.value }));
                          setShowRoleSuggestions(false);
                        }}
                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{role.label}</span>
                        {isSelected && (
                          <span className="ml-auto text-xs text-muted-foreground">↵</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <LocationInput
              value={formData.location}
              onChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
              placeholder="Location (e.g., Los Angeles, Remote)"
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
            return (
              <div
                key={roleNeed.id}
                className="group px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 p-2 rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
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
