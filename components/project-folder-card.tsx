'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  MoreHorizontal,
  Trash2,
  Clapperboard,
  PenTool,
  Megaphone,
} from 'lucide-react';
import { PiFilmScript } from 'react-icons/pi';
import { RiFolder6Line, RiFolder6Fill } from 'react-icons/ri';
import { cn } from '@/lib/utils';

interface ProjectRole {
  id?: string;
  role: string;
  name: string;
  userId?: string | null;
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
  onDelete?: () => void;
  onOpen?: () => void;
}

// Helper to get person name for a role
function getRolePerson(roles: ProjectRole[] | undefined, roleType: string): string | null {
  if (!roles) return null;
  const role = roles.find(r => r.role === roleType);
  return role?.name || null;
}

// Refined role badge component
function RoleBadge({
  icon: Icon,
  label,
  name,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  name: string;
  colorClass: string;
}) {
  return (
    <div className={cn(
      "group/role flex items-center gap-2 px-2 py-1 rounded-md",
      "transition-all duration-200",
      "hover:bg-muted/50"
    )}>
      {/* Icon container */}
      <div className={cn(
        "flex items-center justify-center",
        "w-5 h-5 rounded",
        "bg-muted/50",
        "transition-all duration-200",
        "group-hover/role:scale-105"
      )}>
        <Icon className={cn('h-3 w-3', colorClass)} />
      </div>

      {/* Text content */}
      <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
        <span className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground/60">
          {label}
        </span>
        <span className="text-[11px] font-medium text-foreground truncate">
          {name}
        </span>
      </div>
    </div>
  );
}

export function ProjectFolderCard({
  project,
  href,
  onDelete,
  onOpen,
}: ProjectFolderCardProps) {
  const linkHref = href || `/project/${project.id}`;
  const screenplayCount = project._count?.screenplays || project.screenplays?.length || 0;
  const hasContent = screenplayCount > 0;

  const director = getRolePerson(project.roles, 'director');
  const writer = getRolePerson(project.roles, 'writer');
  const producer = getRolePerson(project.roles, 'producer');

  const hasRoles = director || writer || producer;

  return (
    <div
      className={cn(
        'group relative flex flex-col',
        'transition-all duration-300 ease-out',
        'touch-manipulation active:scale-[0.98]'
      )}
    >
      <Link href={linkHref} className="flex-1 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
        {/* Folder Tab */}
        <div
          className={cn(
            'h-4 sm:h-5 w-[50%] rounded-t-lg',
            'bg-gradient-to-b from-muted to-muted/80',
            'transition-all duration-300',
            'border-t border-l border-r',
            hasContent ? 'border-primary/30' : 'border-border/50',
            'group-hover:border-primary/50',
            'group-hover:-translate-y-0.5'
          )}
        >
          <div className="px-2.5 h-full flex items-center">
            <span className={cn(
              "text-[9px] font-medium uppercase tracking-wider",
              "transition-colors duration-200",
              hasContent ? "text-primary/50" : "text-muted-foreground/40",
              "group-hover:text-primary/70"
            )}>
              Project
            </span>
          </div>
        </div>

        {/* Folder Body */}
        <div
          className={cn(
            'flex-1 flex flex-col -mt-px',
            'bg-card rounded-tr-xl rounded-b-xl',
            'border-2 transition-all duration-300',
            hasContent
              ? 'border-border/50 group-hover:border-primary/40'
              : 'border-border/40 group-hover:border-border/60',
            'group-hover:shadow-lg group-hover:-translate-y-1',
            'min-h-[180px] sm:min-h-[200px]'
          )}
        >
          <div className="p-3 sm:p-4 flex-1 flex flex-col">
            {/* Content Preview Section */}
            <div className="mb-3 flex-1 min-h-[60px]">
              {hasContent ? (
                <div className="space-y-1">
                  {/* Section header with count */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                      Screenplays
                    </span>
                    <span className={cn(
                      "text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full",
                      "bg-primary/10 text-primary/80",
                      "border border-primary/20"
                    )}>
                      {screenplayCount}
                    </span>
                  </div>

                  {project.screenplays?.slice(0, 3).map((screenplay) => (
                    <div
                      key={screenplay.id}
                      className={cn(
                        "group/screenplay flex items-center gap-2 px-2 py-1 rounded-md",
                        "transition-all duration-200",
                        "hover:bg-accent/50 hover:pl-2.5"
                      )}
                    >
                      <PiFilmScript className="h-3 w-3 text-primary/60 flex-shrink-0 transition-transform group-hover/screenplay:scale-110" />
                      <span className="text-xs text-foreground/80 truncate group-hover/screenplay:text-foreground">
                        {screenplay.title}
                      </span>
                    </div>
                  ))}
                  {screenplayCount > 3 && (
                    <div className="flex items-center gap-2 px-2 py-1 text-[11px] text-muted-foreground/60">
                      <div className="h-px flex-1 bg-border/40" />
                      <span>+{screenplayCount - 3} more</span>
                      <div className="h-px flex-1 bg-border/40" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-4">
                  <div className="relative mb-2 transition-transform duration-300 group-hover:scale-105">
                    <RiFolder6Line className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                  <span className="text-xs text-muted-foreground/40 font-medium">
                    No screenplays yet
                  </span>
                </div>
              )}
            </div>

            {/* Roles Section */}
            {hasRoles && (
              <div className="space-y-0.5 mb-3 pb-3 border-b border-border/30">
                {director && (
                  <RoleBadge
                    icon={Clapperboard}
                    label="Dir"
                    name={director}
                    colorClass="text-rose-500 dark:text-rose-400"
                  />
                )}
                {writer && (
                  <RoleBadge
                    icon={PenTool}
                    label="Writer"
                    name={writer}
                    colorClass="text-indigo-500 dark:text-indigo-400"
                  />
                )}
                {producer && (
                  <RoleBadge
                    icon={Megaphone}
                    label="Prod"
                    name={producer}
                    colorClass="text-amber-500 dark:text-amber-400"
                  />
                )}
              </div>
            )}

            {/* Footer: Title, Timestamp, Menu */}
            <div className="mt-auto pt-2 border-t border-border/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-md",
                      "transition-all duration-200",
                      hasContent
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/50 text-muted-foreground/50"
                    )}>
                      {hasContent ? (
                        <RiFolder6Fill className="h-3.5 w-3.5" />
                      ) : (
                        <RiFolder6Line className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground ml-8">
                    <Clock className="h-3 w-3" />
                    <span className="truncate">
                      {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {(onDelete || onOpen) && (
                  <div className={cn(
                    "flex-shrink-0 transition-all duration-200",
                    "opacity-0 group-hover:opacity-100",
                    "focus-within:opacity-100"
                  )}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className={cn(
                            "p-1.5 rounded-md transition-all duration-200",
                            "hover:bg-accent hover:scale-105",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            "active:scale-95"
                          )}
                          aria-label="More options"
                        >
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {onOpen && (
                          <DropdownMenuItem onClick={onOpen}>
                            <RiFolder6Line className="mr-2 h-4 w-4" />
                            Open Project
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={onDelete}
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
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// Skeleton loader for the folder card
export function ProjectFolderCardSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      {/* Tab Skeleton */}
      <div className="h-4 sm:h-5 w-[50%] rounded-t-lg bg-muted/50 border border-muted/30">
        <div className="h-2 w-10 bg-muted/70 rounded mt-1.5 ml-2.5" />
      </div>

      {/* Body Skeleton */}
      <div className="-mt-px bg-card rounded-tr-xl rounded-b-xl border-2 border-border/40 min-h-[180px] sm:min-h-[200px] p-3 sm:p-4">
        {/* Screenplay header */}
        <div className="flex items-center justify-between mb-3">
          <div className="h-2.5 w-16 bg-muted rounded" />
          <div className="h-4 w-5 bg-muted rounded-full" />
        </div>

        {/* Screenplay items */}
        <div className="space-y-2 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 px-2">
              <div className="h-3 w-3 bg-muted rounded" />
              <div className="h-3 flex-1 bg-muted rounded" style={{ width: `${80 - i * 15}%` }} />
            </div>
          ))}
        </div>

        {/* Role skeleton */}
        <div className="space-y-1 mb-3 pb-3 border-b border-border/30">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1">
              <div className="h-5 w-5 bg-muted rounded" />
              <div className="h-2.5 w-8 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>

        {/* Footer skeleton */}
        <div className="pt-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-muted rounded-md" />
            <div className="flex-1">
              <div className="h-4 w-28 bg-muted rounded mb-1.5" />
              <div className="h-2.5 w-20 bg-muted rounded ml-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
