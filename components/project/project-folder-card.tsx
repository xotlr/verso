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
} from 'lucide-react';
import { RiFolder6Line, RiFolder6Fill } from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { ProfileAvatar } from '@/components/profile/profile-avatar';

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
  onDelete?: () => void;
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
}: ProjectFolderCardProps) {
  const linkHref = href || `/project/${project.id}`;
  const screenplayCount = project._count?.screenplays || project.screenplays?.length || 0;
  const hasActions = onDelete || onOpen || onNewScreenplay || onAddExistingScreenplay || onRename || onSettings;

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

  // Card height - matches Series/Screenplay cards
  const cardHeight = 'h-[180px] sm:h-[200px] md:h-[220px]';

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
          'absolute top-0 left-4 w-[38%] h-5 z-0',
          'bg-muted',
          'rounded-t-lg border border-b-0 border-border',
          'transition-colors duration-300'
        )}
      />

      {/* Frontplate - Main card, STATIC */}
      <div
        className={cn(
          'group relative flex flex-col z-10',
          'bg-card rounded-xl',
          'border border-border/60',
          'hover:border-primary hover:shadow-md',
          'transition-all duration-300 ease-out',
          'touch-manipulation cursor-pointer overflow-hidden',
          cardHeight
        )}
      >
        <Link href={linkHref} className="flex-1 flex flex-col">
          <div className="p-5 sm:p-6 flex flex-col h-full font-mono">
            {/* Header: Type Badge + Status + Title + Menu */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                {/* Type & Status badges */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
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
                <h3 className="font-bold uppercase tracking-tight line-clamp-1 text-foreground group-hover/folder:text-primary group-hover/folder:underline transition-colors text-sm sm:text-base md:text-lg">
                  {project.name}
                </h3>
              </div>

              {hasActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="p-2 sm:p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                      aria-label="More options"
                    >
                      <MoreVertical className="h-5 w-5 sm:h-4 sm:w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {onOpen && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onOpen();
                      }}>
                        <RiFolder6Line className="mr-2 h-4 w-4" />
                        Open Project
                      </DropdownMenuItem>
                    )}
                    {(onNewScreenplay || onAddExistingScreenplay) && onOpen && (
                      <DropdownMenuSeparator />
                    )}
                    {onNewScreenplay && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onNewScreenplay();
                      }}>
                        <FilePlus className="mr-2 h-4 w-4" />
                        New Screenplay
                      </DropdownMenuItem>
                    )}
                    {onAddExistingScreenplay && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onAddExistingScreenplay();
                      }}>
                        <FolderInput className="mr-2 h-4 w-4" />
                        Add Existing Screenplay
                      </DropdownMenuItem>
                    )}
                    {(onRename || onSettings) && (
                      <DropdownMenuSeparator />
                    )}
                    {onRename && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onRename();
                      }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename Project
                      </DropdownMenuItem>
                    )}
                    {onSettings && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onSettings();
                      }}>
                        <Settings className="mr-2 h-4 w-4" />
                        Project Settings
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDelete();
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Project
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Roles Section */}
            {(keyRoles.director || keyRoles.writer || keyRoles.producer) && (
              <div className="mt-2 space-y-0.5 text-[10px]">
                {keyRoles.director && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16 uppercase tracking-wide">Directed by</span>
                    <div className="flex items-center gap-1.5">
                      <ProfileAvatar
                        userId={keyRoles.director.user?.id || keyRoles.director.name}
                        imageUrl={keyRoles.director.user?.image}
                        name={keyRoles.director.user?.name || keyRoles.director.name}
                        size="xs"
                      />
                      <span className="text-foreground font-medium truncate">{keyRoles.director.name}</span>
                    </div>
                  </div>
                )}
                {keyRoles.writer && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16 uppercase tracking-wide">Written by</span>
                    <div className="flex items-center gap-1.5">
                      <ProfileAvatar
                        userId={keyRoles.writer.user?.id || keyRoles.writer.name}
                        imageUrl={keyRoles.writer.user?.image}
                        name={keyRoles.writer.user?.name || keyRoles.writer.name}
                        size="xs"
                      />
                      <span className="text-foreground font-medium truncate">{keyRoles.writer.name}</span>
                    </div>
                  </div>
                )}
                {keyRoles.producer && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16 uppercase tracking-wide">Produced by</span>
                    <div className="flex items-center gap-1.5">
                      <ProfileAvatar
                        userId={keyRoles.producer.user?.id || keyRoles.producer.name}
                        imageUrl={keyRoles.producer.user?.image}
                        name={keyRoles.producer.user?.name || keyRoles.producer.name}
                        size="xs"
                      />
                      <span className="text-foreground font-medium truncate">{keyRoles.producer.name}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Spacer to push footer down */}
            <div className="flex-grow" />
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-border/40">
            <div className="px-5 sm:px-6 py-3 flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
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
      <div className="absolute top-0 left-4 w-[38%] h-5 bg-muted rounded-t-lg border border-b-0 border-border" />

      {/* Main card */}
      <div className="relative bg-card rounded-xl border border-border h-[180px] sm:h-[200px] md:h-[220px] overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col h-full font-mono">
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
          <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
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
