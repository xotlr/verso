'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Loader2, User, Users } from 'lucide-react';
import { useTeam } from '@/contexts/team-context';
import { useDialogState } from '@/hooks/use-dialog-state';

interface ProjectRole {
  id: string;
  role: string;
  name: string;
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  banner: string | null;
  logo: string | null;
  budget: number | null;
  updatedAt: string;
  roles: ProjectRole[];
  _count: {
    screenplays: number;
    notes: number;
    schedules: number;
    budgets: number;
  };
}

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: ProjectItem) => void;
}

export function NewProjectDialog({ isOpen, onClose, onCreated }: NewProjectDialogProps) {
  const { teams, currentTeam } = useTeam();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('personal');
  const [selectedType, setSelectedType] = useState<string>('FEATURE_FILM');
  const [selectedRole, setSelectedRole] = useState<string>('writer');
  const { isLoading, error, setIsLoading, setError, reset } = useDialogState();

  // Set default to current team when dialog opens
  React.useEffect(() => {
    if (isOpen && currentTeam) {
      setSelectedTeamId(currentTeam.id);
    } else if (isOpen) {
      setSelectedTeamId('personal');
    }
  }, [isOpen, currentTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          teamId: selectedTeamId !== 'personal' ? selectedTeamId : undefined,
          type: selectedType,
          creatorRole: selectedRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const project = await response.json();
      // Add default values for new projects
      const projectWithCount: ProjectItem = {
        ...project,
        banner: project.banner || null,
        logo: project.logo || null,
        budget: project.budget || null,
        roles: project.roles || [],
        _count: {
          screenplays: 0,
          notes: 0,
          schedules: 0,
          budgets: 0,
        },
      };
      onCreated(projectWithCount);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSelectedTeamId('personal');
    setSelectedType('FEATURE_FILM');
    setSelectedRole('writer');
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Projects help you organize screenplays, notes, schedules, and budgets for a production.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Team Selection - only show if user has teams */}
            {teams.length > 0 && (
              <div className="grid gap-2">
                <Label>Create in</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Personal</span>
                      </div>
                    </SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{team.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My Feature Film"
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label>Project Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FEATURE_FILM">Feature Film</SelectItem>
                  <SelectItem value="SHORT_FILM">Short Film</SelectItem>
                  <SelectItem value="TV_SERIES">TV Series</SelectItem>
                  <SelectItem value="STAGE_PLAY">Stage Play</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the project..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Your role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="writer">Writer</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="producer">Producer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">You can add more team members later</p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
