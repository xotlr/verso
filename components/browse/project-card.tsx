'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface ProjectCardProject {
  id: string;
  name: string;
  description: string | null;
  banner: string | null;
  logo: string | null;
  publishedAt: string | null;
  user: ProjectCardUser;
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

export function ProjectCard({ project, className }: ProjectCardProps) {
  const gradient = getProjectGradient(project.name);

  return (
    <Link
      href={`/project/${project.id}`}
      className={cn(
        'group block',
        'bg-card rounded-xl border border-border/60 overflow-hidden',
        'hover:border-border hover:shadow-md',
        'transition-all duration-200',
        'touch-manipulation',
        className
      )}
    >
      {/* Banner */}
      <div className={cn(
        'h-20 relative bg-gradient-to-br',
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
              className="h-10 w-10 rounded-lg border-2 border-background object-cover"
            />
          </div>
        )}
        {/* Script count badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
            <FileText className="h-3 w-3 mr-1" />
            {project._count.screenplays}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors mb-1">
          {project.name}
        </h3>
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {project.description}
          </p>
        )}

        {/* Footer: Owner + Date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5 rounded-md">
              <AvatarImage src={project.user.image || ''} alt={project.user.name || ''} />
              <AvatarFallback className="text-[10px]">
                {project.user.name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {project.user.name || 'Unknown'}
            </span>
          </div>
          {project.publishedAt && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(project.publishedAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
      <div className="h-20 bg-muted animate-pulse" />
      <div className="p-4">
        <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
        <div className="space-y-2 mb-3">
          <div className="h-3 w-full bg-muted rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
