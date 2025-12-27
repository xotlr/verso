'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { NewProjectDialog } from '@/components/project/new-project-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLayout } from '@/components/layouts/page-layout';
import { ListPageToolbar, SORT_OPTIONS } from '@/components/ui/list-page-toolbar';
import { ListWithPreview } from '@/components/ui/list-preview-panel';
import { ProjectFolderCard, ProjectFolderCardSkeleton } from '@/components/project/project-folder-card';
import { ProjectListRow, ProjectListRowSkeleton } from '@/components/project/project-list-row';
import { RenameProjectDialog } from '@/components/project/rename-project-dialog';
import { useViewMode } from '@/hooks/use-view-mode';
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
import { ImportDropZoneOverlay } from '@/components/import-drop-zone';
import type { ImportResult } from '@/components/import-drop-zone/types';

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
  type?: 'FEATURE_FILM' | 'SHORT_FILM' | 'TV_SERIES' | 'STAGE_PLAY' | 'OTHER' | null;
  status?: 'DEVELOPMENT' | 'PRE_PRODUCTION' | 'PRODUCTION' | 'POST_PRODUCTION' | 'COMPLETED' | null;
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
  const [viewMode, setViewMode] = useViewMode('projects');
  const [hoveredProject, setHoveredProject] = useState<ProjectItem | null>(null);
  const [renameTarget, setRenameTarget] = useState<ProjectItem | null>(null);

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

  const handleImportComplete = async (result: ImportResult) => {
    if (!result.success || !result.content) return;

    try {
      const response = await fetch('/api/screenplays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title || 'Imported Screenplay',
          content: result.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create screenplay');
      }

      const screenplay = await response.json();
      toast.success('Screenplay imported successfully');
      router.push(`/editor/${screenplay.id}`);
    } catch (error) {
      console.error('Error importing screenplay:', error);
      toast.error('Failed to import screenplay');
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

      {/* Drag-drop import overlay */}
      <ImportDropZoneOverlay
        enabled={true}
        onImportComplete={handleImportComplete}
        onImportError={(error) => toast.error(error)}
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

      {/* Rename Project Dialog */}
      {renameTarget && (
        <RenameProjectDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          projectId={renameTarget.id}
          currentName={renameTarget.name}
          currentDescription={renameTarget.description}
          onSuccess={loadProjects}
        />
      )}

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
          viewMode={{
            value: viewMode,
            onChange: setViewMode,
          }}
          className="mb-6"
        />

        {/* Content Grid/List */}
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {[1, 2, 3].map((i) => (
                <ProjectFolderCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <ProjectListRowSkeleton key={i} />
              ))}
            </div>
          )
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
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {filteredProjects.map((project) => (
              <ProjectFolderCard
                key={project.id}
                project={{
                  id: project.id,
                  name: project.name,
                  description: project.description,
                  type: project.type ?? undefined,
                  status: project.status ?? undefined,
                  updatedAt: project.updatedAt,
                  roles: project.roles,
                  screenplays: project.screenplays,
                  _count: project._count,
                }}
                onDelete={() => setDeleteTarget(project.id)}
                onOpen={() => router.push(`/project/${project.id}`)}
                onRename={() => setRenameTarget(project)}
              />
            ))}
          </div>
        ) : (
          <ListWithPreview
            preview={
              hoveredProject ? (
                <ProjectFolderCard
                  project={{
                    id: hoveredProject.id,
                    name: hoveredProject.name,
                    description: hoveredProject.description,
                    type: hoveredProject.type ?? undefined,
                    status: hoveredProject.status ?? undefined,
                    updatedAt: hoveredProject.updatedAt,
                    roles: hoveredProject.roles,
                    screenplays: hoveredProject.screenplays,
                    _count: hoveredProject._count,
                  }}
                />
              ) : null
            }
          >
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <ProjectListRow
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
                  onOpen={() => router.push(`/project/${project.id}`)}
                  onDelete={() => setDeleteTarget(project.id)}
                  onRename={() => setRenameTarget(project)}
                  isHovered={hoveredProject?.id === project.id}
                  onHover={() => setHoveredProject(project)}
                  onLeave={() => setHoveredProject(null)}
                />
              ))}
            </div>
          </ListWithPreview>
        )}
      </PageLayout>
    </>
  );
}
