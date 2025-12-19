'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeaturedProject {
  id: string;
  name: string;
  coverImage: string | null;
  description: string | null;
}

interface ProfileFeaturedProjectProps {
  project: FeaturedProject;
  className?: string;
}

export function ProfileFeaturedProject({
  project,
  className,
}: ProfileFeaturedProjectProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Featured Project
      </h3>
      <Link
        href={`/project/${project.id}`}
        className="group block rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
      >
        <div className="flex gap-3">
          {project.coverImage ? (
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
              <Image
                src={project.coverImage}
                alt={project.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md bg-muted">
              <span className="text-2xl font-bold text-muted-foreground/50">
                {project.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {project.name}
              </h4>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {project.description}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
