'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, FileText, FolderOpen } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getSimpleGradientStyle } from '@/lib/avatar-gradient';
import { cardStyles, textStyles, layoutStyles, skeletonStyles } from '@/lib/styles';
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
}: ProjectListRowProps) {
  const linkHref = href || `/project/${project.id}`;
  const screenplayCount = project._count?.screenplays || project.screenplays?.length || 0;

  // Get unique team members with avatars
  const teamMembers = project.roles
    ?.filter(role => role.user)
    .slice(0, 3) || [];

  return (
    <div
      className={cn(
        layoutStyles.groupRow,
        cardStyles.interactive
      )}
    >
      <Link href={linkHref} className="flex-1 min-w-0">
        {/* Desktop: Horizontal layout */}
        <div className={layoutStyles.listRow}>
          {/* Left: Type Badge */}
          <div className="flex-shrink-0 pt-0.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <FolderOpen className="h-2.5 w-2.5" />
              Project
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
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                <FileText className="h-2.5 w-2.5" />
                {screenplayCount} {screenplayCount === 1 ? 'script' : 'scripts'}
              </span>
            </div>

            {/* Description - visible by default */}
            <p className="text-xs sm:text-sm text-muted-foreground/70 line-clamp-1 mt-1">
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
                    className="h-5 w-5 border border-card"
                  >
                    <AvatarImage src={role.user?.image || undefined} />
                    <AvatarFallback
                      className="text-[8px]"
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
                  className="h-5 w-5 border border-card"
                >
                  <AvatarImage src={role.user?.image || undefined} />
                  <AvatarFallback
                    className="text-[8px]"
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
