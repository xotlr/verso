'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FolderOpen, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RiFolder6Fill, RiFolder6Line } from 'react-icons/ri';

interface Project {
  id: string;
  name: string;
  _count?: {
    screenplays: number;
  };
}

interface MoveToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenplayId: string;
  screenplayTitle: string;
  currentProjectId?: string | null;
  onSuccess: () => void;
}

export function MoveToProjectDialog({
  open,
  onOpenChange,
  screenplayId,
  screenplayTitle,
  currentProjectId,
  onSuccess,
}: MoveToProjectDialogProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      loadProjects();
      setSelectedProjectId(null);
      setSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        // Filter out the current project if screenplay is already in one
        const filtered = currentProjectId
          ? data.filter((p: Project) => p.id !== currentProjectId)
          : data;
        setProjects(filtered);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });

      if (response.ok) {
        const action = selectedProjectId ? 'moved to project' : 'made standalone';
        toast.success(`Screenplay ${action}`);
        onSuccess();
        onOpenChange(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to move screenplay');
      }
    } catch (error) {
      console.error('Error moving screenplay:', error);
      toast.error('Failed to move screenplay');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Screenplay</DialogTitle>
          <DialogDescription>
            Choose a project for &ldquo;{screenplayTitle}&rdquo;
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Project list */}
        <ScrollArea className="h-[280px] rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {/* Make Standalone option */}
              {currentProjectId && (
                <button
                  onClick={() => setSelectedProjectId(null)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                    selectedProjectId === null
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted border border-transparent'
                  )}
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Make Standalone</p>
                    <p className="text-xs text-muted-foreground">
                      Remove from current project
                    </p>
                  </div>
                </button>
              )}

              {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {search ? 'No projects match your search' : 'No projects available'}
                  </p>
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                      selectedProjectId === project.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted border border-transparent'
                    )}
                  >
                    {project._count?.screenplays ? (
                      <RiFolder6Fill className="h-5 w-5 text-primary" />
                    ) : (
                      <RiFolder6Line className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project._count?.screenplays || 0} screenplays
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedProjectId === undefined || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {selectedProjectId === null ? 'Make Standalone' : 'Move'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
