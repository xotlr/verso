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

// Role badge component
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
    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
      <Icon className={cn('h-3 w-3 sm:h-3.5 sm:w-3.5', colorClass)} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground truncate max-w-[80px] sm:max-w-[100px]">{name}</span>
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
        'transition-all duration-200',
        'touch-manipulation active:scale-[0.98]'
      )}
    >
      <Link href={linkHref} className="flex-1 flex flex-col">
        {/* Folder Tab */}
        <div
          className={cn(
            'h-3 sm:h-4 w-[45%] rounded-t-lg',
            'bg-muted/80 group-hover:bg-muted',
            'transition-colors duration-200',
            'border-t border-l border-r border-border/60 group-hover:border-border'
          )}
        />

        {/* Folder Body */}
        <div
          className={cn(
            'flex-1 flex flex-col -mt-px',
            'bg-card rounded-tr-xl rounded-b-xl',
            'border border-border/60 group-hover:border-border group-hover:shadow-md',
            'transition-all duration-200',
            'min-h-[160px] sm:min-h-[180px]',
            // Subtle 3D effect on hover
            'group-hover:-translate-y-0.5'
          )}
        >
          <div className="p-3 sm:p-4 flex-1 flex flex-col">
            {/* Content Preview Section */}
            <div className="mb-3 flex-1">
              {hasContent ? (
                <div className="space-y-1.5">
                  {project.screenplays?.slice(0, 3).map((screenplay) => (
                    <div
                      key={screenplay.id}
                      className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground"
                    >
                      <PiFilmScript className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary/70 flex-shrink-0" />
                      <span className="truncate">{screenplay.title}</span>
                    </div>
                  ))}
                  {screenplayCount > 3 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="ml-5">+{screenplayCount - 3} more</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[40px]">
                  <div className="text-center text-xs sm:text-sm text-muted-foreground/60">
                    <RiFolder6Line className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1 opacity-40" />
                    <span>Empty</span>
                  </div>
                </div>
              )}
            </div>

            {/* Roles Section */}
            {hasRoles && (
              <div className="space-y-1 mb-3 pb-3 border-b border-border/40">
                {director && (
                  <RoleBadge
                    icon={Clapperboard}
                    label="Dir"
                    name={director}
                    colorClass="text-red-500"
                  />
                )}
                {writer && (
                  <RoleBadge
                    icon={PenTool}
                    label="Writer"
                    name={writer}
                    colorClass="text-blue-500"
                  />
                )}
                {producer && (
                  <RoleBadge
                    icon={Megaphone}
                    label="Prod"
                    name={producer}
                    colorClass="text-amber-500"
                  />
                )}
              </div>
            )}

            {/* Footer: Title, Timestamp, Menu */}
            <div className="mt-auto">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {hasContent ? (
                      <RiFolder6Fill className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : (
                      <RiFolder6Line className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <h3 className="text-sm sm:text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-6">
                    <Clock className="h-3 w-3" />
                    <span className="truncate">
                      {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {(onDelete || onOpen) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="p-1.5 hover:bg-accent rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label="More options"
                      >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onOpen && (
                        <DropdownMenuItem onClick={onOpen}>
                          <RiFolder6Line className="mr-2 h-4 w-4" />
                          Open
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
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
    <div className="flex flex-col">
      {/* Folder Tab Skeleton */}
      <div className="h-3 sm:h-4 w-[45%] rounded-t-lg bg-muted/50 animate-pulse" />

      {/* Folder Body Skeleton */}
      <div className="-mt-px bg-card rounded-tr-xl rounded-b-xl border border-border/60 min-h-[160px] sm:min-h-[180px] p-3 sm:p-4">
        <div className="space-y-2 mb-4">
          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-1.5 mb-4">
          <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
        </div>
        <div className="mt-auto pt-2">
          <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-1" />
          <div className="h-3 w-1/3 bg-muted rounded animate-pulse ml-6" />
        </div>
      </div>
    </div>
  );
}
