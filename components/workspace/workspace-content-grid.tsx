'use client';

import { useRouter } from 'next/navigation';
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
import { useWorkspaceDialogs } from '@/hooks/workspace';

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

  // Workspace dialogs via hook
  const {
    selectedStack,
    setSelectedStack,
    stackDialogOpen,
    setStackDialogOpen,
    screenplayToAddToStack,
    addToStackDialogOpen,
    setAddToStackDialogOpen,
    projectToRename,
    setProjectToRename,
    projectToMoveToTeam,
    setProjectToMoveToTeam,
    projectToAddScreenplay,
    setProjectToAddScreenplay,
    seriesToRename,
    setSeriesToRename,
    seriesToMoveToProject,
    setSeriesToMoveToProject,
    handleOpenStack,
    handleRenameStack,
    handleRemoveFromStack,
    handleOpenAddToStack,
    handleAddScreenplayToStack,
    handleCreateNewStackForScreenplay,
    handleArchiveProject,
    handleArchiveSeries,
  } = useWorkspaceDialogs({
    onDataRefresh,
    onRenameStack,
    onRemoveFromStack,
    onAddToStack,
  });

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

    const screenplaysContent = viewMode === 'grid' ? (
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
    ) : (
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
    );

    return <>{screenplaysContent}</>;
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

    const seriesContent = viewMode === 'grid' ? (
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
    ) : (
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
    );

    return <>{seriesContent}</>;
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

  const projectsContent = viewMode === 'grid' ? (
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
  ) : (
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
  );

  return (
    <>
      {projectsContent}

      {/* All dialogs rendered once - Stack dialogs */}
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

      {/* Series dialogs */}
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

      {/* Project dialogs */}
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
