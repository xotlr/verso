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
import {
  SeriesCard,
  SeriesCardSkeleton,
  SeriesListRow,
  SeriesListRowSkeleton,
} from '@/components/series';
import { StackCard } from '@/components/stack-card';
import { WorkspaceDndContext } from './workspace-dnd-context';
import { DraggableScreenplayCard } from './draggable-screenplay-card';
import { DroppableStackCard } from './droppable-stack-card';
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
  onDelete: (id: string, type: 'screenplay' | 'project' | 'series' | 'stack') => void;
  onExport: (screenplay: ScreenplayItem) => void;
  onImportComplete: (result: ImportResult) => void;
  onCreateScreenplay: () => void;
  onCreateProject: () => void;
  onCreateSeries: () => void;
  onMoveToProject?: (screenplay: ScreenplayItem) => void;
  onCreateProjectFromScreenplay?: (screenplay: ScreenplayItem) => void;
  // Stack operations
  onCreateStack: (draggedId: string, targetId: string) => Promise<StackItem | null>;
  onAddToStack: (screenplayId: string, stackId: string) => Promise<void>;
  onDissolveStack: (stackId: string) => Promise<void>;
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
  onDelete,
  onExport,
  onImportComplete: _onImportComplete,
  onCreateScreenplay,
  onCreateProject,
  onCreateSeries,
  onMoveToProject,
  onCreateProjectFromScreenplay,
  onCreateStack,
  onAddToStack,
  onDissolveStack,
}: WorkspaceContentGridProps) {
  const router = useRouter();

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
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
        <WorkspaceDndContext
          onCreateStack={onCreateStack}
          onAddToStack={onAddToStack}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {/* Render stacks first */}
            {filteredStacks.map((stack) => (
              <DroppableStackCard
                key={`stack-${stack.id}`}
                stack={stack}
                href={`/stack/${stack.id}`}
                onUngroup={() => onDissolveStack(stack.id)}
                onDelete={() => onDelete(stack.id, 'stack')}
              />
            ))}
            {/* Then render standalone screenplays */}
            {filteredScreenplays.map((screenplay) => (
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
                  project: screenplay.project,
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
                showWordCount={true}
                onEdit={() => router.push(`/editor/${screenplay.id}`)}
                onExport={() => onExport(screenplay)}
                onDelete={() => onDelete(screenplay.id, 'screenplay')}
                onMoveToProject={onMoveToProject ? () => onMoveToProject(screenplay) : undefined}
                onCreateProject={onCreateProjectFromScreenplay ? () => onCreateProjectFromScreenplay(screenplay) : undefined}
              />
            ))}
          </div>
        </WorkspaceDndContext>
      );
    }

    // List view for screenplays - simple rows (no DnD in list view)
    return (
      <div className="space-y-4">
        {/* Stacks section */}
        {filteredStacks.length > 0 && (
          <div className="space-y-2">
            {filteredStacks.map((stack) => (
              <StackCard
                key={`stack-${stack.id}`}
                stack={stack}
                href={`/stack/${stack.id}`}
                onUngroup={() => onDissolveStack(stack.id)}
                onDelete={() => onDelete(stack.id, 'stack')}
              />
            ))}
          </div>
        )}
        {/* Screenplays list */}
        <div className="space-y-2">
          {filteredScreenplays.map((screenplay) => (
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
                project: screenplay.project,
                author: screenplay.author,
                user: screenplay.user,
                type: screenplay.type || undefined,
                season: screenplay.season,
                episode: screenplay.episode,
                episodeTitle: screenplay.episodeTitle,
                series: screenplay.series,
              }}
              href={`/editor/${screenplay.id}`}
            />
          ))}
        </div>
      </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
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
                _count: s._count,
              }}
              onEdit={() => router.push(`/series/${s.id}`)}
              onDelete={() => onDelete(s.id, 'series')}
            />
          ))}
        </div>
      );
    }

    // List view for series
    return (
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
              _count: s._count,
            }}
            onEdit={() => router.push(`/series/${s.id}`)}
            onDelete={() => onDelete(s.id, 'series')}
          />
        ))}
      </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {filteredProjects.map((project) => (
          <ProjectFolderCard
            key={project.id}
            project={{
              id: project.id,
              name: project.name,
              description: project.description,
              status: project.status ?? undefined,
              updatedAt: project.updatedAt,
              roles: project.roles,
              screenplays: project.screenplays,
              _count: project._count,
            }}
            onDelete={() => onDelete(project.id, 'project')}
            onOpen={() => router.push(`/project/${project.id}`)}
          />
        ))}
      </div>
    );
  }

  // List view for projects - simple rows
  return (
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
        />
      ))}
    </div>
  );
}

export { type TabValue };
