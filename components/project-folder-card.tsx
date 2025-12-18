'use client';

import React from 'react';
import Link from 'next/link';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
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
  FileText,
} from 'lucide-react';
import { RiFolder6Line } from 'react-icons/ri';
import { cn } from '@/lib/utils';

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

export interface ProjectFolderCardData {
  id: string;
  name: string;
  description?: string | null;
  updatedAt: string;
  roles?: ProjectRole[];
  screenplays?: ScreenplayPreview[];
  _count?: {
    screenplays: number;
    notes: number;
  };
}

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

  // Get unique people from roles
  const uniquePeople = React.useMemo(() => {
    if (!project.roles) return [];
    const peopleMap = new Map<string, ProjectRole>();
    project.roles.forEach(role => {
      if (role.name && !peopleMap.has(role.name)) {
        peopleMap.set(role.name, role);
      }
    });
    return Array.from(peopleMap.values());
  }, [project.roles]);

  // Card height - matches Series/Screenplay cards
  const cardHeight = 'h-[180px] sm:h-[200px] md:h-[220px]';

  return (
    <div className="group/folder relative pt-3 transition-all duration-300 ease-out hover:-translate-y-1">
      {/* Folder Tab - extends above main card */}
      <div
        className={cn(
          'absolute top-0 left-4 w-[38%] h-5',
          'bg-primary/12 group-hover/folder:bg-primary/18',
          'rounded-t-lg border border-b-0 border-primary/20',
          'transition-colors duration-300'
        )}
      />

      {/* Main card */}
      <div
        className={cn(
          'group relative flex flex-col',
          'bg-card rounded-xl',
          'border border-border/60',
          'hover:border-border hover:shadow-md',
          'transition-all duration-300 ease-out',
          'touch-manipulation cursor-pointer overflow-hidden',
          cardHeight
        )}
      >
        <Link href={linkHref} className="flex-1 flex flex-col">
          <div className="p-5 sm:p-6 flex flex-col h-full font-mono">
            {/* Header: Type Badge + Title + Menu */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                {/* Type badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    <RiFolder6Line className="h-2.5 w-2.5" />
                    PROJECT
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold uppercase tracking-tight line-clamp-1 text-foreground group-hover/folder:text-primary group-hover/folder:underline transition-colors text-base sm:text-lg md:text-xl">
                  {project.name}
                </h3>

                {/* Script count & description */}
                <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="font-semibold">
                    {screenplayCount} {screenplayCount === 1 ? 'Script' : 'Scripts'}
                  </span>
                  {project.description && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="normal-case tracking-normal line-clamp-1">{project.description}</span>
                    </>
                  )}
                </div>
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

            {/* Spacer to push footer down */}
            <div className="flex-grow" />
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-border/40">
            <div className="px-5 sm:px-6 py-3 flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
              {/* Left: Avatars or script count badge */}
              {uniquePeople.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {uniquePeople.slice(0, 3).map((person, i) => {
                      const userName = person.user?.name || person.name;
                      const userInitial = userName?.[0]?.toUpperCase() || '?';

                      return (
                        <Avatar
                          key={person.id || i}
                          className="w-5 h-5 rounded-md border-2 border-card"
                        >
                          <AvatarImage src={person.user?.image || undefined} alt={userName || 'User'} className="rounded-md" />
                          <AvatarFallback className="rounded-md bg-muted text-muted-foreground font-medium text-[8px]">
                            {userInitial}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })}
                    {uniquePeople.length > 3 && (
                      <div className="flex items-center justify-center w-5 h-5 rounded-md bg-muted border-2 border-card text-[8px] font-semibold text-muted-foreground">
                        +{uniquePeople.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border/50 bg-muted/50 uppercase tracking-wider font-bold text-[10px] sm:text-xs">
                    <FileText className="h-3 w-3" />
                    {screenplayCount}
                  </span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border/50 bg-muted/50 uppercase tracking-wider font-bold text-[10px] sm:text-xs">
                  <FileText className="h-3 w-3" />
                  {screenplayCount} {screenplayCount === 1 ? 'script' : 'scripts'}
                </span>
              )}

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
      <div className="absolute top-0 left-4 w-[38%] h-5 bg-muted/50 rounded-t-lg border border-b-0 border-border/30" />

      {/* Main card */}
      <div className="relative bg-card rounded-xl border border-border/60 h-[180px] sm:h-[200px] md:h-[220px] overflow-hidden">
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
                <div className="h-5 w-5 rounded-md bg-muted/50" />
                <div className="h-5 w-5 rounded-md bg-muted/50" />
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
