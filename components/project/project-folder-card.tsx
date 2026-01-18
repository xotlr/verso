'use client';

import React from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  MoreVertical,
  Trash2,
  Settings,
  FilePlus,
  FolderInput,
  Pencil,
  Users,
  Unlink,
  Archive,
  Star,
} from 'lucide-react';
import { RiFolder6Line } from 'react-icons/ri';
import { cn, createMenuHandler, stopPointerPropagation } from '@/lib/utils';
import { ProfileHoverCard } from '@/components/profile-hover-card';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectRole {
  id?: string;
  role: string;
  name: string;
  userId?: string | null;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface ScreenplayPreview {
  id: string;
  title: string;
}

export type ProjectStatus = 'DEVELOPMENT' | 'PRE_PRODUCTION' | 'PRODUCTION' | 'POST_PRODUCTION' | 'COMPLETED';
export type ProjectType = 'FEATURE_FILM' | 'SHORT_FILM' | 'TV_SERIES' | 'STAGE_PLAY' | 'OTHER';

export interface ProjectFolderCardData {
  id: string;
  name: string;
  description?: string | null;
  type?: ProjectType;
  status?: ProjectStatus;
  updatedAt: string;
  roles?: ProjectRole[];
  screenplays?: ScreenplayPreview[];
  teamId?: string | null;
  team?: { id: string; name: string } | null;
  isArchived?: boolean;
  isFavorite?: boolean;
  _count?: {
    screenplays: number;
    notes: number;
  };
}

// Type display configuration
const TYPE_CONFIG: Record<ProjectType, { label: string; icon: string }> = {
  FEATURE_FILM: { label: 'Feature', icon: '🎬' },
  SHORT_FILM: { label: 'Short', icon: '🎞️' },
  TV_SERIES: { label: 'Series', icon: '📺' },
  STAGE_PLAY: { label: 'Stage', icon: '🎭' },
  OTHER: { label: 'Project', icon: '📁' },
};

// Status display configuration
const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  DEVELOPMENT: { label: 'Development', color: 'bg-blue-500' },
  PRE_PRODUCTION: { label: 'Pre-Production', color: 'bg-yellow-500' },
  PRODUCTION: { label: 'Production', color: 'bg-green-500' },
  POST_PRODUCTION: { label: 'Post-Production', color: 'bg-purple-500' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-600' },
};

interface ProjectFolderCardProps {
  project: ProjectFolderCardData;
  href?: string;
  onOpen?: () => void;
  onNewScreenplay?: () => void;
  onAddExistingScreenplay?: () => void;
  onRename?: () => void;
  onSettings?: () => void;
  onMoveToTeam?: () => void;
  onRemoveFromTeam?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

// Format time compactly (matches SeriesCard)
function formatTimeCompact(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffWeeks < 5) return `${diffWeeks}w`;
  return `${diffMonths}mo`;
}


// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectFolderCard({
  project,
  href,
  onDelete,
  onOpen,
  onNewScreenplay,
  onAddExistingScreenplay,
  onRename,
  onSettings,
  onMoveToTeam,
  onRemoveFromTeam,
  onArchive,
  onToggleFavorite,
}: ProjectFolderCardProps) {
  const linkHref = href || `/project/${project.id}`;
  const screenplayCount = project._count?.screenplays || project.screenplays?.length || 0;
  const hasActions = onDelete || onOpen || onNewScreenplay || onAddExistingScreenplay || onRename || onSettings || onMoveToTeam || onRemoveFromTeam || onArchive || onToggleFavorite;

  // Get key roles (Director, Writer, Producer) - only show filled roles
  const keyRoles = React.useMemo(() => {
    if (!project.roles) return { director: null, writer: null, producer: null };

    // Filter out unfilled placeholder roles
    const filledRoles = project.roles.filter(r => r.name !== 'Unfilled');

    const director = filledRoles.find(r => r.role.toLowerCase().includes('director'));
    const writer = filledRoles.find(r => r.role.toLowerCase().includes('writer') || r.role.toLowerCase().includes('screenplay'));
    const producer = filledRoles.find(r => r.role.toLowerCase().includes('producer'));

    return { director, writer, producer };
  }, [project.roles]);

  // Card height - responsive sizing, more compact on mobile
  const cardHeight = 'min-h-[100px] sm:min-h-[160px] md:min-h-[180px] lg:min-h-[200px]';

  // Get first screenplay for peeking preview
  const firstScreenplay = project.screenplays?.[0];
  const hasScreenplays = screenplayCount > 0;

  return (
    <div className="group/folder relative pt-3">
      {/* Backplate - STATIC, darker than card */}
      {hasScreenplays && (
        <div
          className={cn(
            'absolute inset-x-0 top-3 rounded-xl',
            'bg-muted border border-border',
            cardHeight
          )}
        />
      )}

      {/* Script paper - rises UP on hover to peek out */}
      {firstScreenplay && (
        <div
          className={cn(
            'absolute inset-x-1 top-3 rounded-lg',
            'bg-card border border-border',
            'transition-transform duration-300 ease-out',
            'group-hover/folder:-translate-y-3',
            cardHeight
          )}
        >
          {/* Script title - revealed on hover */}
          <div className="absolute inset-x-0 top-0 px-3 py-1.5 opacity-0 group-hover/folder:opacity-100 transition-opacity duration-300">
            <p className="text-[10px] font-semibold text-muted-foreground truncate uppercase tracking-wide">
              {firstScreenplay.title}
            </p>
          </div>
        </div>
      )}

      {/* Folder Tab - STATIC, behind frontplate */}
      <div
        className={cn(
          'absolute top-0 left-3 sm:left-4 w-[35%] sm:w-[38%] h-4 sm:h-5',
          'bg-muted',
          'rounded-t-md sm:rounded-t-lg border border-b-0 border-border',
          'transition-colors duration-300'
        )}
      />

      {/* Frontplate - Main card, STATIC */}
      <div
        className={cn(
          'group relative flex flex-col',
          'bg-card rounded-xl',
          'border border-border/60',
          'hover:shadow-md',
          'transition-all duration-300 ease-out',
          'touch-manipulation cursor-pointer',
          cardHeight
        )}
      >
        {/* Dropdown Menu - positioned absolutely, OUTSIDE the Link */}
        {hasActions && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={createMenuHandler()}
                  onPointerDown={stopPointerPropagation}
                  className="card-action-btn"
                  aria-label="More options"
                >
                  <MoreVertical className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {onOpen && (
                  <DropdownMenuItem onClick={createMenuHandler(onOpen)}>
                    <RiFolder6Line className="mr-2 h-4 w-4" />
                    Open Project
                  </DropdownMenuItem>
                )}
                {onToggleFavorite && (
                  <DropdownMenuItem onClick={createMenuHandler(onToggleFavorite)}>
                    <Star className={cn("mr-2 h-4 w-4", project.isFavorite && "text-yellow-500 fill-yellow-500")} />
                    {project.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </DropdownMenuItem>
                )}
                {(onNewScreenplay || onAddExistingScreenplay) && (onOpen || onToggleFavorite) && (
                  <DropdownMenuSeparator />
                )}
                {onNewScreenplay && (
                  <DropdownMenuItem onClick={createMenuHandler(onNewScreenplay)}>
                    <FilePlus className="mr-2 h-4 w-4" />
                    New Screenplay
                  </DropdownMenuItem>
                )}
                {onAddExistingScreenplay && (
                  <DropdownMenuItem onClick={createMenuHandler(onAddExistingScreenplay)}>
                    <FolderInput className="mr-2 h-4 w-4" />
                    Add Existing Screenplay
                  </DropdownMenuItem>
                )}
                {(onRename || onSettings) && (
                  <DropdownMenuSeparator />
                )}
                {onRename && (
                  <DropdownMenuItem onClick={createMenuHandler(onRename)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename Project
                  </DropdownMenuItem>
                )}
                {onSettings && (
                  <DropdownMenuItem onClick={createMenuHandler(onSettings)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Project Settings
                  </DropdownMenuItem>
                )}
                {onMoveToTeam && (
                  <DropdownMenuItem onClick={createMenuHandler(onMoveToTeam)}>
                    <Users className="mr-2 h-4 w-4" />
                    Move to Team
                  </DropdownMenuItem>
                )}
                {onRemoveFromTeam && (
                  <DropdownMenuItem onClick={createMenuHandler(onRemoveFromTeam)}>
                    <Unlink className="mr-2 h-4 w-4" />
                    Remove from Team
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <DropdownMenuItem onClick={createMenuHandler(onArchive)}>
                    <Archive className="mr-2 h-4 w-4" />
                    {project.isArchived ? 'Unarchive' : 'Archive'}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={createMenuHandler(onDelete)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Project
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <Link href={linkHref} className="flex-1 flex flex-col">
          <div className="p-2.5 sm:p-4 md:p-5 flex flex-col h-full font-mono">
            {/* Header: Type Badge + Status + Title */}
            <div className={cn('mb-2', hasActions && 'pr-10 sm:pr-8')}>
              {/* Type & Status badges */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className="badge-primary">
                  <RiFolder6Line className="h-2.5 w-2.5" />
                  {project.type ? TYPE_CONFIG[project.type].label : 'Project'}
                </span>
                {project.status && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_CONFIG[project.status].color)} />
                    {STATUS_CONFIG[project.status].label}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="font-bold uppercase tracking-tight line-clamp-1 text-foreground group-hover/folder:text-primary group-hover/folder:underline transition-colors text-sm sm:text-base md:text-lg flex items-center gap-1.5">
                {project.isFavorite && (
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                )}
                <span className="truncate">{project.name}</span>
              </h3>
            </div>

            {/* Roles Section - hidden on tiny screens */}
            {(keyRoles.director || keyRoles.writer || keyRoles.producer) && (
              <div className="mt-2 space-y-0.5 text-[10px] hidden sm:block">
                {keyRoles.director && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16 uppercase tracking-wide">Directed by</span>
                    {keyRoles.director.user ? (
                      <ProfileHoverCard
                        user={{
                          id: keyRoles.director.user.id,
                          name: keyRoles.director.user.name,
                          email: null,
                          image: keyRoles.director.user.image,
                          createdAt: new Date(),
                        }}
                      >
                        <span className="text-foreground font-medium truncate hover:underline cursor-pointer">
                          {keyRoles.director.name}
                        </span>
                      </ProfileHoverCard>
                    ) : (
                      <span className="text-foreground font-medium truncate">{keyRoles.director.name}</span>
                    )}
                  </div>
                )}
                {keyRoles.writer && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16 uppercase tracking-wide">Written by</span>
                    {keyRoles.writer.user ? (
                      <ProfileHoverCard
                        user={{
                          id: keyRoles.writer.user.id,
                          name: keyRoles.writer.user.name,
                          email: null,
                          image: keyRoles.writer.user.image,
                          createdAt: new Date(),
                        }}
                      >
                        <span className="text-foreground font-medium truncate hover:underline cursor-pointer">
                          {keyRoles.writer.name}
                        </span>
                      </ProfileHoverCard>
                    ) : (
                      <span className="text-foreground font-medium truncate">{keyRoles.writer.name}</span>
                    )}
                  </div>
                )}
                {keyRoles.producer && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16 uppercase tracking-wide">Produced by</span>
                    {keyRoles.producer.user ? (
                      <ProfileHoverCard
                        user={{
                          id: keyRoles.producer.user.id,
                          name: keyRoles.producer.user.name,
                          email: null,
                          image: keyRoles.producer.user.image,
                          createdAt: new Date(),
                        }}
                      >
                        <span className="text-foreground font-medium truncate hover:underline cursor-pointer">
                          {keyRoles.producer.name}
                        </span>
                      </ProfileHoverCard>
                    ) : (
                      <span className="text-foreground font-medium truncate">{keyRoles.producer.name}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Spacer to push footer down */}
            <div className="flex-grow" />
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-border/40">
            <div className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-3 flex items-center justify-between text-[10px] sm:text-xs md:text-sm text-muted-foreground">
              {/* Left: Script count */}
              <span className="inline-flex items-center px-2 py-0.5 rounded border border-border/50 bg-muted/50 uppercase tracking-wider font-bold text-[10px] sm:text-xs">
                {screenplayCount} {screenplayCount === 1 ? 'script' : 'scripts'}
              </span>

              {/* Right: Timestamp */}
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTimeCompact(new Date(project.updatedAt))}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

export function ProjectFolderCardSkeleton() {
  return (
    <div className="relative pt-3">
      {/* Folder Tab */}
      <div className="absolute top-0 left-3 sm:left-4 w-[35%] sm:w-[38%] h-4 sm:h-5 bg-muted rounded-t-md sm:rounded-t-lg border border-b-0 border-border" />

      {/* Main card */}
      <div className="relative bg-card rounded-xl border border-border min-h-[100px] sm:min-h-[160px] md:min-h-[180px] lg:min-h-[200px]">
        <div className="p-2.5 sm:p-4 md:p-5 flex flex-col h-full font-mono">
          {/* Header skeleton */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-grow" />

          {/* Footer skeleton */}
          <div className="card-footer">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                <div className="h-5 w-5 rounded-md bg-muted" />
                <div className="h-5 w-5 rounded-md bg-muted" />
              </div>
              <div className="h-5 w-12 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
