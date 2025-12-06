'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { NewProjectDialog } from '@/components/new-project-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLayout } from '@/components/layouts/page-layout';
import { ListPageToolbar, SORT_OPTIONS } from '@/components/ui/list-page-toolbar';
import { ProjectFolderCard, ProjectFolderCardSkeleton } from '@/components/project-folder-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus } from 'lucide-react';
import { RiFolder6Line } from 'react-icons/ri';

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
  screenplays?: { id: string; title: string }[];
  _count: {
    screenplays: number;
    notes: number;
    schedules: number;
    budgets: number;
  };
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectCreated = (project: ProjectItem) => {
    setProjects((prev) => [project, ...prev]);
    setNewProjectOpen(false);
    router.push(`/project/${project.id}`);
  };

  const deleteProject = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/projects/${deleteTarget}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== deleteTarget));
        toast.success('Project deleted');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects
      .filter(
        (project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'recent':
          default:
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
      });
  }, [projects, searchQuery, sortBy]);

  return (
    <>
      <NewProjectDialog
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreated={handleProjectCreated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? Screenplays in this project will become standalone. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageLayout
        title="Projects"
        description={`${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''}${searchQuery ? ' (filtered)' : ''}`}
        actions={
          <Button onClick={() => setNewProjectOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Project</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      >
        {/* Search and Sort */}
        <ListPageToolbar
          search={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: 'Search projects...',
          }}
          sort={{
            value: sortBy,
            onChange: (v) => setSortBy(v as typeof sortBy),
            options: [SORT_OPTIONS.recent, SORT_OPTIONS.name],
          }}
          className="mb-6"
        />

        {/* Content Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {[1, 2, 3].map((i) => (
              <ProjectFolderCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            icon={<RiFolder6Line className="h-8 w-8 text-muted-foreground" />}
            title={searchQuery ? 'No projects found' : 'No projects yet'}
            description={searchQuery
              ? 'Try a different search term'
              : 'Create a project to organize your screenplays, notes, schedules, and budgets'}
            action={!searchQuery ? {
              label: 'Create Project',
              onClick: () => setNewProjectOpen(true),
              icon: <Plus className="h-5 w-5" />,
            } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {filteredProjects.map((project) => (
              <ProjectFolderCard
                key={project.id}
                project={{
                  id: project.id,
                  name: project.name,
                  description: project.description,
                  updatedAt: project.updatedAt,
                  roles: project.roles,
                  screenplays: project.screenplays,
                  _count: project._count,
                }}
                onDelete={() => setDeleteTarget(project.id)}
                onOpen={() => router.push(`/project/${project.id}`)}
              />
            ))}
          </div>
        )}
      </PageLayout>
    </>
  );
}
