'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Tv } from 'lucide-react';
import { PiFilmScript } from 'react-icons/pi';
import { RiFolder6Line } from 'react-icons/ri';
import { EmptyState } from '@/components/ui/empty-state';
import type { ImportResult } from '@/components/import-drop-zone';
import {
  ScreenplayListCard,
  ScreenplayListCardSkeleton,
} from '@/components/screenplay-list-card';
import {
  ScreenplayListRow,
  ScreenplayListRowSkeleton,
} from '@/components/screenplay-list-row';
import {
  ProjectFolderCard,
  ProjectFolderCardSkeleton,
} from '@/components/project-folder-card';
import {
  ProjectListRow,
  ProjectListRowSkeleton,
} from '@/components/project-list-row';
import {
  SeriesCard,
  SeriesCardSkeleton,
} from '@/components/series-card';
import {
  SeriesListRow,
  SeriesListRowSkeleton,
} from '@/components/series-list-row';
import type { ScreenplayItem, ProjectItem, SeriesItem } from '@/hooks/use-workspace-data';
import type { ViewMode } from '@/hooks/use-view-mode';

type TabValue = 'screenplays' | 'series' | 'projects';

interface WorkspaceContentGridProps {
  activeTab: TabValue;
  isLoading: boolean;
  screenplays: ScreenplayItem[];
  projects: ProjectItem[];
  series: SeriesItem[];
  searchQuery: string;
  showFavorites: boolean;
  viewMode: ViewMode;
  onDelete: (id: string, type: 'screenplay' | 'project' | 'series') => void;
  onExport: (screenplay: ScreenplayItem) => void;
  onImportComplete: (result: ImportResult) => void;
  onCreateScreenplay: () => void;
  onCreateProject: () => void;
  onCreateSeries: () => void;
  onMoveToProject?: (screenplay: ScreenplayItem) => void;
  onCreateProjectFromScreenplay?: (screenplay: ScreenplayItem) => void;
}

export function WorkspaceContentGrid({
  activeTab,
  isLoading,
  screenplays,
  projects,
  series,
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
}: WorkspaceContentGridProps) {
  const router = useRouter();
  const [hoveredScreenplay, setHoveredScreenplay] = useState<ScreenplayItem | null>(null);
  const [hoveredProject, setHoveredProject] = useState<ProjectItem | null>(null);
  const [hoveredSeries, setHoveredSeries] = useState<SeriesItem | null>(null);

  // Filter and sort screenplays
  const filteredScreenplays = screenplays
    .filter((screenplay) => {
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

  // Screenplays tab
  if (activeTab === 'screenplays') {
    if (filteredScreenplays.length === 0) {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {filteredScreenplays.map((screenplay) => (
            <ScreenplayListCard
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
      );
    }

    // List view for screenplays - filing cabinet style
    return (
      <div className="relative pb-[350px]">
        {filteredScreenplays.map((screenplay, index) => (
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
            isHovered={hoveredScreenplay?.id === screenplay.id}
            onHover={() => setHoveredScreenplay(screenplay)}
            onLeave={() => setHoveredScreenplay(null)}
            index={index}
            totalCount={filteredScreenplays.length}
          />
        ))}
      </div>
    );
  }

  // Series tab
  if (activeTab === 'series') {
    if (filteredSeries.length === 0) {
      return (
        <EmptyState
          icon={
            <Tv className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
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
            isHovered={hoveredSeries?.id === s.id}
            onHover={() => setHoveredSeries(s)}
            onLeave={() => setHoveredSeries(null)}
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

  // List view for projects - filing cabinet style
  return (
    <div className="relative pb-[350px]">
      {filteredProjects.map((project, index) => (
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
          isHovered={hoveredProject?.id === project.id}
          onHover={() => setHoveredProject(project)}
          onLeave={() => setHoveredProject(null)}
          index={index}
          totalCount={filteredProjects.length}
        />
      ))}
    </div>
  );
}

export { type TabValue };
