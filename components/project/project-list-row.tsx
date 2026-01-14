'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, MoreVertical, FilePlus, FolderInput, Pencil, Settings, Trash2, Users, Unlink, Archive } from 'lucide-react';
import { RiFolder6Line } from 'react-icons/ri';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, createMenuHandler, stopPointerPropagation } from '@/lib/utils';
import { getSimpleGradientStyle } from '@/lib/ui/avatar-gradient';
import { cardStyles, textStyles, layoutStyles, skeletonStyles } from '@/lib/ui/styles';
import type { ProjectFolderCardData } from './project-folder-card';

// Format time compactly
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

interface ProjectListRowProps {
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
  // Keep for backwards compatibility but no longer used
  isHovered?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
  index?: number;
  totalCount?: number;
}

export function ProjectListRow({
  project,
  href,
  onOpen,
  onNewScreenplay,
  onAddExistingScreenplay,
  onRename,
  onSettings,
  onMoveToTeam,
  onRemoveFromTeam,
  onArchive,
  onDelete,
}: ProjectListRowProps) {
  const linkHref = href || `/project/${project.id}`;
  const screenplayCount = project._count?.screenplays || project.screenplays?.length || 0;
  const hasActions = onOpen || onNewScreenplay || onAddExistingScreenplay || onRename || onSettings || onMoveToTeam || onRemoveFromTeam || onArchive || onDelete;

  // Get unique team members with avatars
  const teamMembers = project.roles
    ?.filter(role => role.user)
    .slice(0, 3) || [];

  return (
    <div
      className={cn(
        layoutStyles.groupRow,
        cardStyles.interactive,
        "flex items-center gap-2"
      )}
    >
      <Link href={linkHref} className="flex-1 min-w-0">
        {/* Desktop: Horizontal layout */}
        <div className={layoutStyles.listRow}>
          {/* Left: Type Badge - icon only */}
          <div className="flex-shrink-0">
            <span className="icon-btn-primary">
              <RiFolder6Line className="h-4 w-4" />
            </span>
          </div>

          {/* Middle: Title & Description */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(textStyles.boldTitle, 'truncate max-w-full sm:max-w-[300px] md:max-w-[400px]')}>
                {project.name}
              </h3>

              {/* Screenplay count badge */}
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary font-semibold">
                {screenplayCount} {screenplayCount === 1 ? 'script' : 'scripts'}
              </span>
            </div>

            {/* Description - visible by default */}
            <p className={textStyles.listDescription}>
              {project.description || "No description"}
            </p>
          </div>

          {/* Right: Metadata badges - hidden on mobile, shown on sm+ */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {/* Team Members Avatars */}
            {teamMembers.length > 0 && (
              <div className="flex items-center -space-x-1.5">
                {teamMembers.map((role, i) => (
                  <Avatar
                    key={role.id || i}
                    className="h-5 w-5 rounded-full border border-card"
                  >
                    <AvatarImage src={role.user?.image || undefined} className="rounded-full" />
                    <AvatarFallback
                      className="text-[8px] rounded-full"
                      style={getSimpleGradientStyle(role.user?.name || role.name)}
                    >
                      {(role.user?.name || role.name).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {(project.roles?.length || 0) > 3 && (
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-[8px] font-medium border border-card">
                    +{(project.roles?.length || 0) - 3}
                  </div>
                )}
              </div>
            )}

            {/* Timestamp */}
            <span className={textStyles.iconTextXs}>
              <Clock className="h-2.5 w-2.5" />
              {formatTimeCompact(new Date(project.updatedAt))}
            </span>
          </div>
        </div>

        {/* Mobile: Metadata row below */}
        <div className={cn(layoutStyles.rowGap2, 'sm:hidden mt-2 flex-wrap ml-10')}>
          {/* Team Members Avatars */}
          {teamMembers.length > 0 && (
            <div className="flex items-center -space-x-1.5">
              {teamMembers.map((role, i) => (
                <Avatar
                  key={role.id || i}
                  className="h-5 w-5 rounded-full border border-card"
                >
                  <AvatarImage src={role.user?.image || undefined} className="rounded-full" />
                  <AvatarFallback
                    className="text-[8px] rounded-full"
                    style={getSimpleGradientStyle(role.user?.name || role.name)}
                  >
                    {(role.user?.name || role.name).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {(project.roles?.length || 0) > 3 && (
                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-[8px] font-medium border border-card">
                  +{(project.roles?.length || 0) - 3}
                </div>
              )}
            </div>
          )}

          {/* Timestamp */}
          <span className={cn(textStyles.iconTextXs, 'ml-auto')}>
            <Clock className="h-2.5 w-2.5" />
            {formatTimeCompact(new Date(project.updatedAt))}
          </span>
        </div>
      </Link>

      {/* Dropdown Menu */}
      {hasActions && (
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
            {(onNewScreenplay || onAddExistingScreenplay) && onOpen && (
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
      )}
    </div>
  );
}

// Skeleton for loading state
export function ProjectListRowSkeleton() {
  return (
    <div className={cn('p-3 sm:p-4', cardStyles.skeleton)}>
      <div className={layoutStyles.listRow}>
        {/* Type badge skeleton */}
        <div className={cn(skeletonStyles.base, 'w-16 h-5 flex-shrink-0')} />

        {/* Content skeleton */}
        <div className="flex-1 min-w-0">
          <div className={cn(skeletonStyles.text3_4, 'mb-2')} />
          <div className={skeletonStyles.textFull} />
        </div>

        {/* Metadata skeleton */}
        <div className="hidden sm:flex items-center gap-2">
          <div className={cn(skeletonStyles.base, 'h-5 w-12')} />
          <div className={cn(skeletonStyles.base, 'h-5 w-12')} />
        </div>
      </div>
    </div>
  );
}
