'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import { RiFolder6Fill } from 'react-icons/ri';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getSimpleGradientStyle } from '@/lib/avatar-gradient';
import { ProjectFolderCard, type ProjectFolderCardData } from './project-folder-card';

// Tab header height (the visible part when stacked)
const TAB_HEIGHT = 32;

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
  isHovered?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
  index?: number;
  totalCount?: number;
}

export function ProjectListRow({
  project,
  href,
  isHovered,
  onHover,
  onLeave,
  index = 0,
  totalCount = 1,
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
        "relative transition-all duration-300 ease-out",
        // Heavy overlap - only show tab height of each card (except first)
        index > 0 && `-mt-[calc(100%-${TAB_HEIGHT}px)]`,
        // Hover: pull up to reveal full card
        isHovered && "-translate-y-24 shadow-2xl"
      )}
      style={{ zIndex: isHovered ? 100 : totalCount - index }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Tab Header - Always visible */}
      <Link
        href={linkHref}
        className={cn(
          "flex items-center gap-2 px-3 bg-card border border-border/60 rounded-t-lg",
          "transition-all duration-200",
          // Colored tab indicator
          "border-l-4 border-l-primary",
          isHovered
            ? "bg-accent/50 border-border"
            : "hover:bg-accent/30"
        )}
        style={{ height: `${TAB_HEIGHT}px` }}
      >
        {/* Folder Icon */}
        <div className="flex-shrink-0 p-1 rounded bg-primary/10 text-primary">
          <RiFolder6Fill className="h-3.5 w-3.5" />
        </div>

        {/* Name */}
        <h3 className="flex-1 font-semibold text-sm truncate">
          {project.name}
        </h3>

        {/* Team Members Avatars */}
        {teamMembers.length > 0 && (
          <div className="hidden md:flex items-center -space-x-1.5">
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

        {/* Screenplay Count */}
        <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">
          <Users className="h-2.5 w-2.5" />
          {screenplayCount}
        </span>

        {/* Timestamp */}
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {formatTimeCompact(new Date(project.updatedAt))}
        </span>
      </Link>

      {/* Full Card Content - Revealed on hover */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          "border-x border-b border-border/60 rounded-b-lg bg-card",
          isHovered ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0 border-b-0"
        )}
      >
        <div className="p-3">
          <ProjectFolderCard project={project} />
        </div>
      </div>
    </div>
  );
}

// Skeleton for loading state
export function ProjectListRowSkeleton() {
  return (
    <div
      className="bg-card border border-border/60 rounded-lg border-l-4 border-l-muted animate-pulse"
      style={{ height: `${TAB_HEIGHT}px` }}
    >
      <div className="flex items-center gap-2 px-3 h-full">
        <div className="w-6 h-6 rounded bg-muted" />
        <div className="flex-1 h-4 bg-muted rounded" />
        <div className="w-12 h-3 bg-muted rounded" />
      </div>
    </div>
  );
}
