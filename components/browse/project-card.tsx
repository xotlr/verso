'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RiFolder6Line } from 'react-icons/ri';
import { Clock } from 'lucide-react';
import { getSimpleGradientStyle } from '@/lib/avatar-gradient';

// Format time compactly (matches other cards)
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

interface ProjectCardUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface ProjectRole {
  id: string;
  role: string;
  name: string;
  user?: { id: string; image: string | null } | null;
}

interface ProjectCardProject {
  id: string;
  name: string;
  description: string | null;
  banner: string | null;
  logo: string | null;
  status?: string;
  publishedAt: string | null;
  user: ProjectCardUser;
  roles?: ProjectRole[];
  _count: {
    screenplays: number;
  };
}

interface ProjectCardProps {
  project: ProjectCardProject;
  className?: string;
}

// Generate a gradient based on project name
function getProjectGradient(name: string): string {
  const gradients = [
    'from-blue-500/20 to-purple-500/20',
    'from-green-500/20 to-teal-500/20',
    'from-orange-500/20 to-red-500/20',
    'from-pink-500/20 to-rose-500/20',
    'from-indigo-500/20 to-blue-500/20',
    'from-amber-500/20 to-orange-500/20',
  ];
  const index = name.length % gradients.length;
  return gradients[index];
}

// Format status for display
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    DEVELOPMENT: 'Development',
    PRE_PRODUCTION: 'Pre-Production',
    PRODUCTION: 'Production',
    POST_PRODUCTION: 'Post-Production',
    COMPLETED: 'Completed',
  };
  return statusMap[status] || status;
}

// Format role for display
function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    director: 'Director',
    writer: 'Writer',
    producer: 'Producer',
    executive_producer: 'Exec. Producer',
    cinematographer: 'Cinematographer',
    editor: 'Editor',
    composer: 'Composer',
    sound_designer: 'Sound Designer',
    production_designer: 'Production Designer',
    costume_designer: 'Costume Designer',
    casting_director: 'Casting Director',
    first_ad: '1st AD',
    line_producer: 'Line Producer',
    actor: 'Actor',
    gaffer: 'Gaffer',
    grip: 'Grip',
    other: 'Crew',
  };
  return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className="bg-background/80 backdrop-blur-sm text-[10px] sm:text-xs font-medium"
    >
      {formatStatus(status)}
    </Badge>
  );
}

// Stacked avatars component for credits
function StackedCredits({ roles, owner }: { roles?: ProjectRole[]; owner: ProjectCardUser }) {
  // Combine owner with roles, owner first
  const credits: Array<{ id: string; name: string; role: string; image: string | null }> = [
    { id: owner.id, name: owner.name || 'Unknown', role: 'Owner', image: owner.image },
  ];

  // Add unique roles (skip if same person as owner)
  if (roles) {
    for (const role of roles) {
      if (role.user?.id !== owner.id) {
        credits.push({
          id: role.id,
          name: role.name,
          role: formatRole(role.role),
          image: role.user?.image || null,
        });
      }
    }
  }

  const maxVisible = 4;
  const visibleCredits = credits.slice(0, maxVisible);
  const remainingCount = credits.length - maxVisible;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {visibleCredits.map((credit, index) => (
            <Tooltip key={credit.id}>
              <TooltipTrigger asChild>
                <div
                  className="relative"
                  style={{ zIndex: visibleCredits.length - index }}
                >
                  <Avatar className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-background">
                    <AvatarImage src={credit.image || ''} alt={credit.name} />
                    <AvatarFallback
                      className="text-[10px] text-white font-medium"
                      style={getSimpleGradientStyle(credit.id)}
                    >
                      {credit.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <span className="font-medium">{credit.name}</span>
                <span className="text-muted-foreground ml-1">({credit.role})</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-1.5 text-xs text-muted-foreground">
                +{remainingCount}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {credits.slice(maxVisible).map(c => `${c.name} (${c.role})`).join(', ')}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

export function ProjectCard({ project, className }: ProjectCardProps) {
  const gradient = getProjectGradient(project.name);

  return (
    <Link
      href={`/project/${project.id}`}
      className={cn(
        'group flex flex-col',
        'bg-card rounded-xl border border-border/60',
        'hover:border-border hover:shadow-md',
        'transition-all duration-200',
        'touch-manipulation',
        className
      )}
    >
      {/* Banner */}
      <div className={cn(
        'h-16 sm:h-20 relative bg-gradient-to-br overflow-hidden rounded-t-xl',
        gradient
      )}>
        {project.banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.banner}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Logo overlay */}
        {project.logo && (
          <div className="absolute bottom-2 left-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.logo}
              alt=""
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg border-2 border-background object-cover"
            />
          </div>
        )}
        {/* Status badge - top left */}
        {project.status && (
          <div className="absolute top-2 left-2">
            <StatusBadge status={project.status} />
          </div>
        )}
        {/* Script count badge - top right */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-[10px] sm:text-xs">
            <RiFolder6Line className="h-3 w-3 mr-1" />
            {project._count.screenplays}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 pb-0">
        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors mb-1">
          {project.name}
        </h3>
        {project.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}
      </div>

      {/* Footer: Credits + Date - matches other card footers */}
      <div className="mt-auto border-t border-border/40">
        <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex-1 min-w-0 mr-2">
            <StackedCredits roles={project.roles} owner={project.user} />
          </div>
          {project.publishedAt && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Clock className="h-3 w-3" />
              <span className="text-[10px] sm:text-xs">
                {formatTimeCompact(new Date(project.publishedAt))}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col bg-card rounded-xl border border-border/60 overflow-hidden">
      <div className="h-16 sm:h-20 bg-muted animate-pulse" />
      <div className="p-3 sm:p-4 pb-0">
        <div className="h-4 sm:h-5 w-3/4 bg-muted rounded animate-pulse mb-2" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="mt-auto border-t border-border/40">
        <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-muted animate-pulse border-2 border-background" />
            ))}
          </div>
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
