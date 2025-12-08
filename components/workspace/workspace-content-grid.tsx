'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PiFilmScript } from 'react-icons/pi';
import { RiFolder6Line } from 'react-icons/ri';
import { EmptyState } from '@/components/ui/empty-state';
import { ImportDropZoneCard, ImportResult } from '@/components/import-drop-zone';
import {
  ScreenplayListCard,
  ScreenplayListCardSkeleton,
} from '@/components/screenplay-list-card';
import {
  ProjectFolderCard,
  ProjectFolderCardSkeleton,
} from '@/components/project-folder-card';
import type { ScreenplayItem, ProjectItem } from '@/hooks/use-workspace-data';

type TabValue = 'screenplays' | 'projects';

interface WorkspaceContentGridProps {
  activeTab: TabValue;
  isLoading: boolean;
  screenplays: ScreenplayItem[];
  projects: ProjectItem[];
  searchQuery: string;
  showFavorites: boolean;
  onDelete: (id: string, type: 'screenplay' | 'project') => void;
  onExport: (screenplay: ScreenplayItem) => void;
  onImportComplete: (result: ImportResult) => void;
  onCreateScreenplay: () => void;
  onCreateProject: () => void;
}

export function WorkspaceContentGrid({
  activeTab,
  isLoading,
  screenplays,
  projects,
  searchQuery,
  showFavorites,
  onDelete,
  onExport,
  onImportComplete,
  onCreateScreenplay,
  onCreateProject,
}: WorkspaceContentGridProps) {
  const router = useRouter();

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

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {activeTab === 'screenplays'
          ? [1, 2, 3].map((i) => <ScreenplayListCardSkeleton key={i} />)
          : [1, 2, 3].map((i) => <ProjectFolderCardSkeleton key={i} />)}
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

    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Import Drop Zone Card - Hidden on mobile */}
        <div className="hidden sm:block">
          <ImportDropZoneCard
            context="dashboard"
            onImportComplete={onImportComplete}
            onImportError={(error) => console.error('Import error:', error)}
          />
        </div>
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
            }}
            href={`/editor/${screenplay.id}`}
            showFavorite={true}
            showGenre={true}
            showProject={true}
            showWordCount={true}
            onEdit={() => router.push(`/editor/${screenplay.id}`)}
            onExport={() => onExport(screenplay)}
            onDelete={() => onDelete(screenplay.id, 'screenplay')}
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
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

export { type TabValue };
