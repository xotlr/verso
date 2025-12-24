'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSimpleGradientStyle } from '@/lib/ui/avatar-gradient';
import { Folder, FileText, MapPin } from 'lucide-react';

interface UserCardUser {
  id: string;
  name: string | null;
  image: string | null;
  title: string | null;
  bio: string | null;
  location: string | null;
  _count: {
    projects: number;
    screenplays: number;
  };
}

interface UserCardProps {
  user: UserCardUser;
  className?: string;
}

export function UserCard({ user, className }: UserCardProps) {
  return (
    <Link
      href={`/profile/${user.id}`}
      className={cn(
        'group block',
        'bg-card rounded-xl border border-border/60',
        'hover:border-border hover:shadow-md',
        'transition-all duration-200',
        'touch-manipulation',
        className
      )}
    >
      <div className="p-4">
        {/* Header: Avatar + Name */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-12 w-12 flex-shrink-0 rounded-none">
            <AvatarImage src={user.image || ''} alt={user.name || ''} className="rounded-none" />
            <AvatarFallback
              className="text-lg font-medium text-white rounded-none"
              style={getSimpleGradientStyle(user.id)}
            >
              {user.name?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {user.name || 'Unknown User'}
            </h3>
            {user.title && (
              <p className="text-sm text-muted-foreground truncate">
                {user.title}
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {user.bio}
          </p>
        )}

        {/* Stats and Location */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Folder className="h-3.5 w-3.5" />
              {user._count.projects}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {user._count.screenplays}
            </span>
          </div>
          {user.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{user.location}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border/60 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 w-full bg-muted rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex gap-3">
        <div className="h-3 w-8 bg-muted rounded animate-pulse" />
        <div className="h-3 w-8 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
