'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Layers } from 'lucide-react';
import { PiFilmScript } from 'react-icons/pi';
import { RiFolder6Line } from 'react-icons/ri';
import { EmptyState } from '@/components/ui/empty-state';
import type { ImportResult } from '@/components/import-drop-zone';
import {
  ScreenplayListCardSkeleton,
} from '@/components/screenplay/screenplay-list-card';
import {
  ScreenplayListRow,
  ScreenplayListRowSkeleton,
} from '@/components/screenplay/screenplay-list-row';
import {
  ProjectFolderCard,
  ProjectFolderCardSkeleton,
} from '@/components/project/project-folder-card';
import {
  ProjectListRow,
  ProjectListRowSkeleton,
} from '@/components/project/project-list-row';
import { RenameProjectDialog } from '@/components/project/rename-project-dialog';
import { MoveProjectToTeamDialog } from '@/components/move-project-to-team-dialog';
import {
  SeriesCard,
  SeriesCardSkeleton,
  SeriesListRow,
  SeriesListRowSkeleton,
} from '@/components/series';
import { RenameSeriesDialog } from '@/components/rename-series-dialog';
import { MoveSeriesToProjectDialog } from '@/components/move-series-to-project-dialog';
import { AddExistingScreenplayDialog } from '@/components/add-existing-screenplay-dialog';
import { StackDialog, AddToStackDialog, StackListRow } from '@/components/stack';
import { WorkspaceDndContext } from './workspace-dnd-context';
import { DraggableScreenplayCard } from './draggable-screenplay-card';
import { DroppableStackCard } from './droppable-stack-card';
import { useScreenplayActionsContext, type ScreenplayActionTarget } from '@/contexts/screenplay-actions-context';
import type { ScreenplayItem, ProjectItem, SeriesItem, StackItem } from '@/hooks/use-workspace-data';
import type { ViewMode } from '@/hooks/use-view-mode';

type TabValue = 'screenplays' | 'series' | 'projects';

interface WorkspaceContentGridProps {
  activeTab: TabValue;
  isLoading: boolean;
  screenplays: ScreenplayItem[];
  projects: ProjectItem[];
  series: SeriesItem[];
  stacks: StackItem[];
  searchQuery: string;
  showFavorites: boolean;
  viewMode: ViewMode;
  userId?: string;
  // Generic delete for all types (projects, series, stacks use this)
  onDelete: (id: string, type: 'screenplay' | 'project' | 'series' | 'stack') => void;
  onImportComplete: (result: ImportResult) => void;
  onCreateScreenplay: () => void;
  onCreateProject: () => void;
  onCreateSeries: () => void;
  onDataRefresh?: () => void;
  // Stack operations
  onCreateStack: (draggedId: string, targetId: string) => Promise<StackItem | null>;
  onAddToStack: (screenplayId: string, stackId: string) => Promise<void>;
  onDissolveStack: (stackId: string) => Promise<void>;
  onRenameStack?: (stackId: string, name: string) => Promise<void>;
  onRemoveFromStack?: (screenplayId: string, stackId: string) => Promise<void>;
  // Project-specific screenplay actions
  onNewScreenplayInProject?: (projectId: string) => void;
}

export function WorkspaceContentGrid({
  activeTab,
  isLoading,
  screenplays,
  projects,
  series,
  stacks,
  searchQuery,
  showFavorites,
  viewMode,
  userId,
  onDelete,
  onImportComplete: _onImportComplete,
  onCreateScreenplay,
  onCreateProject,
  onCreateSeries,
  onDataRefresh,
  onCreateStack,
  onAddToStack,
  onDissolveStack,
  onRenameStack,
  onRemoveFromStack,
  onNewScreenplayInProject,
}: WorkspaceContentGridProps) {
  const router = useRouter();

  // Get all screenplay actions from context (standardized across all views)
  const {
    openDelete: openDeleteScreenplay,
    openRename,
    openMoveToProject,
    openMoveToTeam,
    doExport,
    doToggleFavorite,
    doToggleArchive,
    doRemoveFromProject,
    doRemoveFromTeam,
    doCreateProject,
  } = useScreenplayActionsContext();

  // Helper to convert ScreenplayItem to ScreenplayActionTarget
  const toActionTarget = (s: ScreenplayItem): ScreenplayActionTarget => ({
    id: s.id,
    title: s.title,
    synopsis: s.synopsis,
    logline: s.logline,
    projectId: s.projectId,
    teamId: s.teamId,
    project: s.project,
    team: s.team,
    isFavorite: s.isFavorite,
    isArchived: s.isArchived,
  });

  // Stack dialog state
  const [selectedStack, setSelectedStack] = useState<StackItem | null>(null);
  const [stackDialogOpen, setStackDialogOpen] = useState(false);

  // Add to stack dialog state
  const [screenplayToAddToStack, setScreenplayToAddToStack] = useState<ScreenplayItem | null>(null);
  const [addToStackDialogOpen, setAddToStackDialogOpen] = useState(false);

  // Project rename dialog state
  const [projectToRename, setProjectToRename] = useState<ProjectItem | null>(null);

  // Project move to team dialog state
  const [projectToMoveToTeam, setProjectToMoveToTeam] = useState<ProjectItem | null>(null);

  // Series rename dialog state
  const [seriesToRename, setSeriesToRename] = useState<SeriesItem | null>(null);

  // Series move to project dialog state
  const [seriesToMoveToProject, setSeriesToMoveToProject] = useState<SeriesItem | null>(null);

  // Add existing screenplay to project dialog state
  const [projectToAddScreenplay, setProjectToAddScreenplay] = useState<ProjectItem | null>(null);

  // Archive handlers for projects
  const handleArchiveProject = useCallback(async (project: ProjectItem) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !project.isArchived }),
      });
      if (response.ok) {
        toast.success(project.isArchived ? 'Unarchived' : 'Archived');
        onDataRefresh?.();
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Failed to update archive status');
    }
  }, [onDataRefresh]);

  // Archive handlers for series
  const handleArchiveSeries = useCallback(async (s: SeriesItem) => {
    try {
      const response = await fetch(`/api/series/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !s.isArchived }),
      });
      if (response.ok) {
        toast.success(s.isArchived ? 'Unarchived' : 'Archived');
        onDataRefresh?.();
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Failed to update archive status');
    }
  }, [onDataRefresh]);

  const handleOpenStack = (stack: StackItem) => {
    setSelectedStack(stack);
    setStackDialogOpen(true);
  };

  const handleRenameStack = async (stackId: string, name: string) => {
    if (onRenameStack) {
      await onRenameStack(stackId, name);
      // Update local state
      if (selectedStack && selectedStack.id === stackId) {
        setSelectedStack({ ...selectedStack, name });
      }
    }
  };

  const handleRemoveFromStack = async (screenplayId: string, stackId: string) => {
    if (onRemoveFromStack) {
      await onRemoveFromStack(screenplayId, stackId);
      // Update local state to remove the screenplay from the dialog
      if (selectedStack && selectedStack.id === stackId) {
        const updatedScreenplays = selectedStack.screenplays?.filter(s => s.id !== screenplayId) || [];
        if (updatedScreenplays.length === 0) {
          // Stack is now empty, close dialog
          setStackDialogOpen(false);
          setSelectedStack(null);
        } else {
          setSelectedStack({
            ...selectedStack,
            screenplays: updatedScreenplays,
            _count: { screenplays: updatedScreenplays.length },
          });
        }
      }
    }
  };

  const handleOpenAddToStack = (screenplay: ScreenplayItem) => {
    setScreenplayToAddToStack(screenplay);
    setAddToStackDialogOpen(true);
  };

  const handleAddScreenplayToStack = async (stackId: string) => {
    if (screenplayToAddToStack) {
      await onAddToStack(screenplayToAddToStack.id, stackId);
      setAddToStackDialogOpen(false);
      setScreenplayToAddToStack(null);
    }
  };

  const handleCreateNewStackForScreenplay = async (_name: string) => {
    if (screenplayToAddToStack) {
      // Create a new stack with this screenplay
      // We need another screenplay to create a stack, so we'll use the createStack with the same screenplay
      // Actually for mobile, we might want a different API that creates a stack with just one screenplay
      // For now, we'll just close the dialog - the user needs to drag another screenplay or use desktop
      // TODO: Add API to create a stack with a single screenplay
      setAddToStackDialogOpen(false);
      setScreenplayToAddToStack(null);
    }
  };

  // Filter and sort screenplays (exclude those in stacks - they appear inside stack cards)
  const filteredScreenplays = screenplays
    .filter((screenplay) => {
      // Exclude screenplays that are in stacks
      if (screenplay.stackId) return false;
      const matchesSearch =
        screenplay.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        screenplay.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFavorites = !showFavorites || screenplay.isFavorite;
      return matchesSearch && matchesFavorites;
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  // Filter and sort projects
  const filteredProjects = projects
    .filter(
      (project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false)
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  // Filter and sort series
  const filteredSeries = series
    .filter(
      (s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.logline?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  // Filter and sort stacks
  const filteredStacks = stacks
    .filter(
      (stack) =>
        stack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stack.screenplays?.some((s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  // Loading state
  if (isLoading) {
    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {activeTab === 'screenplays' && [1, 2, 3].map((i) => <ScreenplayListCardSkeleton key={i} />)}
          {activeTab === 'series' && [1, 2, 3].map((i) => <SeriesCardSkeleton key={i} />)}
          {activeTab === 'projects' && [1, 2, 3].map((i) => <ProjectFolderCardSkeleton key={i} />)}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {activeTab === 'screenplays' && [1, 2, 3, 4, 5].map((i) => <ScreenplayListRowSkeleton key={i} />)}
        {activeTab === 'series' && [1, 2, 3, 4, 5].map((i) => <SeriesListRowSkeleton key={i} />)}
        {activeTab === 'projects' && [1, 2, 3, 4, 5].map((i) => <ProjectListRowSkeleton key={i} />)}
      </div>
    );
  }

  // Screenplays tab - includes stacks (grouped screenplays)
  if (activeTab === 'screenplays') {
    const hasContent = filteredScreenplays.length > 0 || filteredStacks.length > 0;

    if (!hasContent) {
      return (
        <EmptyState
          icon={
            <PiFilmScript className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
          }
          title={searchQuery ? 'No screenplays found' : 'No screenplays yet'}
          description={
            searchQuery
              ? 'Try a different search term'
              : 'Create your first screenplay and bring your stories to life'
          }
          action={
            !searchQuery
              ? {
                  label: 'Create Screenplay',
                  onClick: onCreateScreenplay,
                  icon: <Plus className="h-4 w-4 sm:h-5 sm:w-5" />,
                }
              : undefined
          }
        />
      );
    }

    if (viewMode === 'grid') {
      return (
        <>
          <WorkspaceDndContext
            onCreateStack={onCreateStack}
            onAddToStack={onAddToStack}
          >
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
              {/* Render stacks first */}
              {filteredStacks.map((stack) => (
                <DroppableStackCard
                  key={`stack-${stack.id}`}
                  stack={stack}
                  onClick={() => handleOpenStack(stack)}
                  onUngroup={() => onDissolveStack(stack.id)}
                  onDelete={() => onDelete(stack.id, 'stack')}
                />
              ))}
              {/* Then render standalone screenplays */}
              {filteredScreenplays.map((screenplay) => {
                const target = toActionTarget(screenplay);
                return (
                  <DraggableScreenplayCard
                    key={screenplay.id}
                    fullScreenplay={screenplay}
                    screenplay={{
                      id: screenplay.id,
                      title: screenplay.title,
                      logline: screenplay.logline,
                      synopsis: screenplay.synopsis,
                      updatedAt: screenplay.updatedAt,
                      wordCount: screenplay.wordCount,
                      genre: screenplay.genre,
                      isFavorite: screenplay.isFavorite,
                      isArchived: screenplay.isArchived,
                      project: screenplay.project,
                      team: screenplay.team,
                      author: screenplay.author,
                      user: screenplay.user,
                      type: screenplay.type || undefined,
                      season: screenplay.season,
                      episode: screenplay.episode,
                      episodeTitle: screenplay.episodeTitle,
                      series: screenplay.series,
                    }}
                    href={`/editor/${screenplay.id}`}
                    showFavorite={true}
                    showGenre={true}
                    showProject={true}
                    showTeam={true}
                    showWordCount={true}
                    onEdit={() => router.push(`/editor/${screenplay.id}`)}
                    onRename={() => openRename(target)}
                    onExport={() => doExport(target)}
                    onToggleFavorite={() => doToggleFavorite(target)}
                    onDelete={() => openDeleteScreenplay(target)}
                    onMoveToProject={() => openMoveToProject(target)}
                    onRemoveFromProject={screenplay.projectId ? () => doRemoveFromProject(target) : undefined}
                    onCreateProject={!screenplay.projectId ? () => doCreateProject(target) : undefined}
                    onMoveToTeam={() => openMoveToTeam(target)}
                    onRemoveFromTeam={screenplay.teamId ? () => doRemoveFromTeam(target) : undefined}
                    onAddToStack={stacks.length > 0 ? () => handleOpenAddToStack(screenplay) : undefined}
                    onArchive={() => doToggleArchive(target)}
                  />
                );
              })}
            </div>
          </WorkspaceDndContext>
          <StackDialog
            stack={selectedStack}
            open={stackDialogOpen}
            onOpenChange={setStackDialogOpen}
            onRename={handleRenameStack}
            onUngroup={(stackId) => {
              onDissolveStack(stackId);
              setStackDialogOpen(false);
              setSelectedStack(null);
            }}
            onRemoveFromStack={handleRemoveFromStack}
          />
          <AddToStackDialog
            open={addToStackDialogOpen}
            onOpenChange={setAddToStackDialogOpen}
            screenplayTitle={screenplayToAddToStack?.title || ''}
            stacks={stacks.map(s => ({
              id: s.id,
              name: s.name,
              screenplayCount: s._count?.screenplays || s.screenplays?.length || 0,
            }))}
            onAddToStack={handleAddScreenplayToStack}
            onCreateNewStack={handleCreateNewStackForScreenplay}
          />
        </>
      );
    }

    // List view for screenplays - simple rows (no DnD in list view)
    return (
      <>
        <div className="space-y-4">
          {/* Stacks section */}
          {filteredStacks.length > 0 && (
            <div className="space-y-2">
              {filteredStacks.map((stack) => (
                <StackListRow
                  key={`stack-${stack.id}`}
                  stack={stack}
                  onClick={() => handleOpenStack(stack)}
                  onEdit={() => handleOpenStack(stack)}
                  onUngroup={() => onDissolveStack(stack.id)}
                  onDelete={() => onDelete(stack.id, 'stack')}
                />
              ))}
            </div>
          )}
          {/* Screenplays list */}
          <div className="space-y-2">
            {filteredScreenplays.map((screenplay) => {
              const target = toActionTarget(screenplay);
              return (
                <ScreenplayListRow
                  key={screenplay.id}
                  screenplay={{
                    id: screenplay.id,
                    title: screenplay.title,
                    logline: screenplay.logline,
                    synopsis: screenplay.synopsis,
                    updatedAt: screenplay.updatedAt,
                    wordCount: screenplay.wordCount,
                    genre: screenplay.genre,
                    isFavorite: screenplay.isFavorite,
                    isArchived: screenplay.isArchived,
                    project: screenplay.project,
                    team: screenplay.team,
                    author: screenplay.author,
                    user: screenplay.user,
                    type: screenplay.type || undefined,
                    season: screenplay.season,
                    episode: screenplay.episode,
                    episodeTitle: screenplay.episodeTitle,
                    series: screenplay.series,
                  }}
                  href={`/editor/${screenplay.id}`}
                  onEdit={() => router.push(`/editor/${screenplay.id}`)}
                  onRename={() => openRename(target)}
                  onExport={() => doExport(target)}
                  onToggleFavorite={() => doToggleFavorite(target)}
                  onDelete={() => openDeleteScreenplay(target)}
                  onMoveToProject={() => openMoveToProject(target)}
                  onRemoveFromProject={screenplay.projectId ? () => doRemoveFromProject(target) : undefined}
                  onCreateProject={!screenplay.projectId ? () => doCreateProject(target) : undefined}
                  onMoveToTeam={() => openMoveToTeam(target)}
                  onRemoveFromTeam={screenplay.teamId ? () => doRemoveFromTeam(target) : undefined}
                  onAddToStack={stacks.length > 0 ? () => handleOpenAddToStack(screenplay) : undefined}
                  onArchive={() => doToggleArchive(target)}
                />
              );
            })}
          </div>
        </div>
        <StackDialog
          stack={selectedStack}
          open={stackDialogOpen}
          onOpenChange={setStackDialogOpen}
          onRename={handleRenameStack}
          onUngroup={(stackId) => {
            onDissolveStack(stackId);
            setStackDialogOpen(false);
            setSelectedStack(null);
          }}
          onRemoveFromStack={handleRemoveFromStack}
        />
        <AddToStackDialog
          open={addToStackDialogOpen}
          onOpenChange={setAddToStackDialogOpen}
          screenplayTitle={screenplayToAddToStack?.title || ''}
          stacks={stacks.map(s => ({
            id: s.id,
            name: s.name,
            screenplayCount: s._count?.screenplays || s.screenplays?.length || 0,
          }))}
          onAddToStack={handleAddScreenplayToStack}
          onCreateNewStack={handleCreateNewStackForScreenplay}
        />
      </>
    );
  }

  // Series tab
  if (activeTab === 'series') {
    if (filteredSeries.length === 0) {
      return (
        <EmptyState
          icon={
            <Layers className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
          }
          title={searchQuery ? 'No series found' : 'No series yet'}
          description={
            searchQuery
              ? 'Try a different search term'
              : 'Create a TV series to organize episodes by season'
          }
          action={
            !searchQuery
              ? {
                  label: 'Create Series',
                  onClick: onCreateSeries,
                  icon: <Plus className="h-4 w-4 sm:h-5 sm:w-5" />,
                }
              : undefined
          }
        />
      );
    }

    if (viewMode === 'grid') {
      return (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
            {filteredSeries.map((s) => (
              <SeriesCard
                key={s.id}
                series={{
                  id: s.id,
                  title: s.title,
                  logline: s.logline,
                  genre: s.genre,
                  format: s.format,
                  updatedAt: s.updatedAt,
                  projectId: s.projectId,
                  project: s.project,
                  isArchived: s.isArchived,
                  _count: s._count,
                }}
                onEdit={() => router.push(`/series/${s.id}`)}
                onRename={() => setSeriesToRename(s)}
                onMoveToProject={() => setSeriesToMoveToProject(s)}
                onRemoveFromProject={s.projectId ? () => setSeriesToMoveToProject(s) : undefined}
                onArchive={() => handleArchiveSeries(s)}
                onDelete={() => onDelete(s.id, 'series')}
              />
            ))}
          </div>
          {/* Series Rename Dialog */}
          {seriesToRename && (
            <RenameSeriesDialog
              open={!!seriesToRename}
              onOpenChange={(open) => !open && setSeriesToRename(null)}
              seriesId={seriesToRename.id}
              currentTitle={seriesToRename.title}
              onSuccess={() => {
                setSeriesToRename(null);
                onDataRefresh?.();
              }}
            />
          )}
          {/* Series Move to Project Dialog */}
          {seriesToMoveToProject && (
            <MoveSeriesToProjectDialog
              open={!!seriesToMoveToProject}
              onOpenChange={(open) => !open && setSeriesToMoveToProject(null)}
              seriesId={seriesToMoveToProject.id}
              seriesTitle={seriesToMoveToProject.title}
              currentProjectId={seriesToMoveToProject.projectId}
              onSuccess={() => {
                setSeriesToMoveToProject(null);
                onDataRefresh?.();
              }}
            />
          )}
        </>
      );
    }

    // List view for series
    return (
      <>
        <div className="space-y-2">
          {filteredSeries.map((s) => (
            <SeriesListRow
              key={s.id}
              series={{
                id: s.id,
                title: s.title,
                logline: s.logline,
                genre: s.genre,
                format: s.format,
                updatedAt: s.updatedAt,
                projectId: s.projectId,
                project: s.project,
                isArchived: s.isArchived,
                _count: s._count,
              }}
              onEdit={() => router.push(`/series/${s.id}`)}
              onRename={() => setSeriesToRename(s)}
              onMoveToProject={() => setSeriesToMoveToProject(s)}
              onRemoveFromProject={s.projectId ? () => setSeriesToMoveToProject(s) : undefined}
              onArchive={() => handleArchiveSeries(s)}
              onDelete={() => onDelete(s.id, 'series')}
            />
          ))}
        </div>
        {/* Series Rename Dialog */}
        {seriesToRename && (
          <RenameSeriesDialog
            open={!!seriesToRename}
            onOpenChange={(open) => !open && setSeriesToRename(null)}
            seriesId={seriesToRename.id}
            currentTitle={seriesToRename.title}
            onSuccess={() => {
              setSeriesToRename(null);
              onDataRefresh?.();
            }}
          />
        )}
        {/* Series Move to Project Dialog */}
        {seriesToMoveToProject && (
          <MoveSeriesToProjectDialog
            open={!!seriesToMoveToProject}
            onOpenChange={(open) => !open && setSeriesToMoveToProject(null)}
            seriesId={seriesToMoveToProject.id}
            seriesTitle={seriesToMoveToProject.title}
            currentProjectId={seriesToMoveToProject.projectId}
            onSuccess={() => {
              setSeriesToMoveToProject(null);
              onDataRefresh?.();
            }}
          />
        )}
      </>
    );
  }

  // Projects tab
  if (filteredProjects.length === 0) {
    return (
      <EmptyState
        icon={
          <RiFolder6Line className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
        }
        title={searchQuery ? 'No projects found' : 'No projects yet'}
        description={
          searchQuery
            ? 'Try a different search term'
            : 'Create a project to organize your screenplays, notes, schedules, and budgets'
        }
        action={
          !searchQuery
            ? {
                label: 'Create Project',
                onClick: onCreateProject,
                icon: <Plus className="h-4 w-4 sm:h-5 sm:w-5" />,
              }
            : undefined
        }
      />
    );
  }

  if (viewMode === 'grid') {
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {filteredProjects.map((project) => (
            <ProjectFolderCard
              key={project.id}
              project={{
                id: project.id,
                name: project.name,
                description: project.description,
                status: project.status ?? undefined,
                updatedAt: project.updatedAt,
                teamId: project.teamId,
                team: project.team,
                roles: project.roles,
                screenplays: project.screenplays,
                isArchived: project.isArchived,
                _count: project._count,
              }}
              onOpen={() => router.push(`/project/${project.id}`)}
              onNewScreenplay={onNewScreenplayInProject ? () => onNewScreenplayInProject(project.id) : undefined}
              onAddExistingScreenplay={() => setProjectToAddScreenplay(project)}
              onRename={() => setProjectToRename(project)}
              onSettings={() => router.push(`/project/${project.id}/settings`)}
              onMoveToTeam={() => setProjectToMoveToTeam(project)}
              onRemoveFromTeam={project.teamId ? () => setProjectToMoveToTeam(project) : undefined}
              onArchive={() => handleArchiveProject(project)}
              onDelete={() => onDelete(project.id, 'project')}
            />
          ))}
        </div>
        {/* Project Rename Dialog */}
        {projectToRename && userId && (
          <RenameProjectDialog
            open={!!projectToRename}
            onOpenChange={(open) => !open && setProjectToRename(null)}
            projectId={projectToRename.id}
            currentName={projectToRename.name}
            currentDescription={projectToRename.description}
            currentBanner={projectToRename.banner}
            userId={userId}
            onSuccess={() => {
              setProjectToRename(null);
              onDataRefresh?.();
            }}
          />
        )}
        {/* Project Move to Team Dialog */}
        {projectToMoveToTeam && (
          <MoveProjectToTeamDialog
            open={!!projectToMoveToTeam}
            onOpenChange={(open) => !open && setProjectToMoveToTeam(null)}
            projectId={projectToMoveToTeam.id}
            projectName={projectToMoveToTeam.name}
            currentTeamId={projectToMoveToTeam.teamId}
            onSuccess={() => {
              setProjectToMoveToTeam(null);
              onDataRefresh?.();
            }}
          />
        )}
        {/* Add Existing Screenplay to Project Dialog */}
        {projectToAddScreenplay && (
          <AddExistingScreenplayDialog
            open={!!projectToAddScreenplay}
            onOpenChange={(open) => !open && setProjectToAddScreenplay(null)}
            projectId={projectToAddScreenplay.id}
            projectName={projectToAddScreenplay.name}
            onSuccess={() => {
              setProjectToAddScreenplay(null);
              onDataRefresh?.();
            }}
          />
        )}
      </>
    );
  }

  // List view for projects - simple rows
  return (
    <>
      <div className="space-y-2">
        {filteredProjects.map((project) => (
          <ProjectListRow
            key={project.id}
            project={{
              id: project.id,
              name: project.name,
              description: project.description,
              updatedAt: project.updatedAt,
              teamId: project.teamId,
              team: project.team,
              roles: project.roles,
              screenplays: project.screenplays,
              isArchived: project.isArchived,
              _count: project._count,
            }}
            onOpen={() => router.push(`/project/${project.id}`)}
            onNewScreenplay={onNewScreenplayInProject ? () => onNewScreenplayInProject(project.id) : undefined}
            onAddExistingScreenplay={() => setProjectToAddScreenplay(project)}
            onRename={() => setProjectToRename(project)}
            onSettings={() => router.push(`/project/${project.id}/settings`)}
            onMoveToTeam={() => setProjectToMoveToTeam(project)}
            onRemoveFromTeam={project.teamId ? () => setProjectToMoveToTeam(project) : undefined}
            onArchive={() => handleArchiveProject(project)}
            onDelete={() => onDelete(project.id, 'project')}
          />
        ))}
      </div>
      {/* Project Rename Dialog */}
      {projectToRename && userId && (
        <RenameProjectDialog
          open={!!projectToRename}
          onOpenChange={(open) => !open && setProjectToRename(null)}
          projectId={projectToRename.id}
          currentName={projectToRename.name}
          currentDescription={projectToRename.description}
          currentBanner={projectToRename.banner}
          userId={userId}
          onSuccess={() => {
            setProjectToRename(null);
            onDataRefresh?.();
          }}
        />
      )}
      {/* Project Move to Team Dialog */}
      {projectToMoveToTeam && (
        <MoveProjectToTeamDialog
          open={!!projectToMoveToTeam}
          onOpenChange={(open) => !open && setProjectToMoveToTeam(null)}
          projectId={projectToMoveToTeam.id}
          projectName={projectToMoveToTeam.name}
          currentTeamId={projectToMoveToTeam.teamId}
          onSuccess={() => {
            setProjectToMoveToTeam(null);
            onDataRefresh?.();
          }}
        />
      )}
      {/* Add Existing Screenplay to Project Dialog */}
      {projectToAddScreenplay && (
        <AddExistingScreenplayDialog
          open={!!projectToAddScreenplay}
          onOpenChange={(open) => !open && setProjectToAddScreenplay(null)}
          projectId={projectToAddScreenplay.id}
          projectName={projectToAddScreenplay.name}
          onSuccess={() => {
            setProjectToAddScreenplay(null);
            onDataRefresh?.();
          }}
        />
      )}
    </>
  );
}

export { type TabValue };
