'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Folder, FileText, MapPin } from 'lucide-react';
import { getPrimaryGradientStyle, getSimpleGradientStyle } from '@/lib/avatar-gradient';

interface ProfileCardUser {
  id: string;
  name: string | null;
  username?: string | null;
  image: string | null;
  banner: string | null;
  title: string | null;
  bio: string | null;
  location: string | null;
  _count: {
    projects: number;
    screenplays: number;
  };
}

interface ProfileCardProps {
  user: ProfileCardUser;
  className?: string;
}

export function ProfileCard({ user, className }: ProfileCardProps) {
  return (
    <Link
      href={user.username ? `/u/${user.username}` : `/profile/${user.id}`}
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
      <div
        className="h-20 sm:h-24 relative"
        style={!user.banner ? getPrimaryGradientStyle(user.id) : undefined}
      >
        {user.banner && (
          <Image
            src={user.banner}
            alt=""
            fill
            className="object-cover"
          />
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Avatar - overlapping banner */}
        <div className="-mt-7 sm:-mt-8 mb-2">
          <Avatar className="h-14 w-14 rounded-md border-[3px] border-background shadow-md">
            <AvatarImage src={user.image || ''} alt={user.name || ''} className="rounded-md" />
            <AvatarFallback
              className="rounded-md text-white text-lg font-medium"
              style={getSimpleGradientStyle(user.id)}
            >
              {user.name?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name + Title */}
        <div className="mb-2">
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {user.name || 'Unknown User'}
          </h3>
          {user.title && (
            <p className="text-sm text-muted-foreground truncate">
              {user.title}
            </p>
          )}
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
              <span className="truncate max-w-[80px]">{user.location}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
      {/* Banner skeleton */}
      <div className="h-20 sm:h-24 bg-muted animate-pulse" />

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Avatar skeleton */}
        <div className="-mt-7 sm:-mt-8 mb-2">
          <div className="h-14 w-14 rounded-md bg-muted animate-pulse border-[3px] border-background" />
        </div>

        {/* Name + Title skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        </div>

        {/* Bio skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-3 w-full bg-muted rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="flex gap-3">
          <div className="h-3 w-8 bg-muted rounded animate-pulse" />
          <div className="h-3 w-8 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
