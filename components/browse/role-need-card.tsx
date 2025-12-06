'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clapperboard,
  PenTool,
  Megaphone,
  Camera,
  Scissors,
  Music,
  Headphones,
  Palette,
  Users,
  User,
  MapPin,
  DollarSign,
  Briefcase,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Role definitions with icons and colors
const ROLE_DEFINITIONS: {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}[] = [
  { value: 'director', label: 'Director', icon: Clapperboard, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  { value: 'writer', label: 'Writer', icon: PenTool, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { value: 'producer', label: 'Producer', icon: Megaphone, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { value: 'executive_producer', label: 'Exec. Producer', icon: Megaphone, color: 'text-amber-600', bgColor: 'bg-amber-600/10' },
  { value: 'cinematographer', label: 'DP', icon: Camera, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { value: 'editor', label: 'Editor', icon: Scissors, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { value: 'composer', label: 'Composer', icon: Music, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  { value: 'sound_designer', label: 'Sound Designer', icon: Headphones, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  { value: 'production_designer', label: 'Production Designer', icon: Palette, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { value: 'costume_designer', label: 'Costume Designer', icon: Palette, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  { value: 'casting_director', label: 'Casting Director', icon: Users, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  { value: 'first_ad', label: '1st AD', icon: User, color: 'text-slate-500', bgColor: 'bg-slate-500/10' },
  { value: 'line_producer', label: 'Line Producer', icon: User, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { value: 'actor', label: 'Actor', icon: User, color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  { value: 'gaffer', label: 'Gaffer', icon: User, color: 'text-yellow-600', bgColor: 'bg-yellow-600/10' },
  { value: 'grip', label: 'Grip', icon: User, color: 'text-stone-500', bgColor: 'bg-stone-500/10' },
  { value: 'other', label: 'Other', icon: Briefcase, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
];

function getRoleDefinition(roleValue: string) {
  return ROLE_DEFINITIONS.find((r) => r.value === roleValue) || ROLE_DEFINITIONS[ROLE_DEFINITIONS.length - 1];
}

interface RoleNeedCardProject {
  id: string;
  name: string;
  banner: string | null;
  logo: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface RoleNeedCardData {
  id: string;
  role: string;
  description: string | null;
  location: string | null;
  isPaid: boolean;
  createdAt: string;
  project: RoleNeedCardProject;
  _count: {
    applications: number;
  };
  hasApplied?: boolean;
  applicationStatus?: string | null;
}

interface RoleNeedCardProps {
  roleNeed: RoleNeedCardData;
  onApplyClick?: () => void;
  className?: string;
}

export function RoleNeedCard({ roleNeed, onApplyClick, className }: RoleNeedCardProps) {
  const roleDef = getRoleDefinition(roleNeed.role);
  const Icon = roleDef.icon;

  const hasApplied = roleNeed.hasApplied || false;
  const isPending = roleNeed.applicationStatus === 'PENDING';
  const isAccepted = roleNeed.applicationStatus === 'ACCEPTED';

  return (
    <div
      className={cn(
        'group',
        'bg-card rounded-xl border border-border/60 overflow-hidden',
        'hover:border-border hover:shadow-md',
        'transition-all duration-200',
        className
      )}
    >
      {/* Header with role icon */}
      <div className={cn('p-4 flex items-start gap-3', roleDef.bgColor)}>
        <div className={cn('p-2.5 rounded-lg bg-background/80 backdrop-blur-sm', roleDef.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{roleDef.label}</h3>
          <Link
            href={`/project/${roleNeed.project.id}`}
            className="text-sm text-muted-foreground hover:text-primary transition-colors truncate block"
          >
            {roleNeed.project.name}
          </Link>
        </div>
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 justify-end">
          {roleNeed.isPaid && (
            <Badge variant="secondary" className="text-xs gap-1 bg-green-500/10 text-green-600 border-green-500/20">
              <DollarSign className="h-3 w-3" />
              Paid
            </Badge>
          )}
          {roleNeed.location && (
            <Badge variant="outline" className="text-xs gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{roleNeed.location}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pt-3">
        {roleNeed.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {roleNeed.description}
          </p>
        )}

        {/* Footer: Owner + Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-5 w-5 flex-shrink-0">
              <AvatarImage src={roleNeed.project.user.image || ''} alt={roleNeed.project.user.name || ''} />
              <AvatarFallback className="text-[10px]">
                {roleNeed.project.user.name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {roleNeed.project.user.name || 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground">
              &middot; {formatDistanceToNow(new Date(roleNeed.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Apply button */}
          {hasApplied ? (
            <Badge
              variant={isAccepted ? 'default' : 'secondary'}
              className={cn(
                'text-xs gap-1',
                isAccepted && 'bg-green-500 hover:bg-green-500',
                isPending && 'bg-amber-500/10 text-amber-600'
              )}
            >
              <Check className="h-3 w-3" />
              {isAccepted ? 'Accepted' : isPending ? 'Applied' : 'Applied'}
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                onApplyClick?.();
              }}
              className="text-xs h-7 px-2.5"
            >
              I&apos;m Interested
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function RoleNeedCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
      <div className="p-4 flex items-start gap-3 bg-muted/50">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="p-4 pt-3">
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-2/3 mb-3" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-7 w-24" />
        </div>
      </div>
    </div>
  );
}
