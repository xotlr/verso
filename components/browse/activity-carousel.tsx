'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSimpleGradientStyle } from '@/lib/avatar-gradient';
import { FileText, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface ActivityScreenplay {
  id: string;
  title: string;
  synopsis: string | null;
  genre: string | null;
}

interface Activity {
  id: string;
  type: string;
  entityId: string | null;
  entityTitle: string | null;
  createdAt: string;
  user: ActivityUser;
  screenplay?: ActivityScreenplay;
}

interface ActivityCarouselProps {
  className?: string;
}

export function ActivityCarousel({ className }: ActivityCarouselProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch('/api/explore/activity?limit=20');
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
        }
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, []);

  if (isLoading) {
    return (
      <div className={cn('py-4', className)}>
        <div className="flex items-center gap-2 px-4 mb-3">
          <Sparkles className="h-4 w-4 text-orange-500" />
          <h2 className="text-sm font-medium text-foreground">Recent</h2>
        </div>
        <div className="flex gap-3 px-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-20 rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <div className={cn('py-4', className)}>
      <div className="flex items-center gap-2 px-4 mb-3">
        <Sparkles className="h-4 w-4 text-orange-500" />
        <h2 className="text-sm font-medium text-foreground">Recent</h2>
      </div>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 px-4 pb-2">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const screenplayId = activity.screenplay?.id || activity.entityId;

  return (
    <Link
      href={screenplayId ? `/read/${screenplayId}` : '#'}
      className={cn(
        'flex flex-col items-center gap-1.5 w-20 flex-shrink-0',
        'group touch-manipulation'
      )}
    >
      {/* Avatar with ring */}
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full opacity-80" />
        <Avatar className="h-16 w-16 relative border-2 border-background">
          <AvatarImage src={activity.user.image || ''} alt={activity.user.name || ''} />
          <AvatarFallback
            className="text-lg font-medium text-white"
            style={getSimpleGradientStyle(activity.user.id)}
          >
            {activity.user.name?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        {/* Activity type badge */}
        <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-1">
          <FileText className="h-3 w-3" />
        </div>
      </div>
      {/* Username */}
      <span className="text-xs text-muted-foreground truncate w-full text-center group-hover:text-foreground transition-colors">
        {activity.user.name?.split(' ')[0] || 'User'}
      </span>
    </Link>
  );
}

export function ActivityCarouselSkeleton() {
  return (
    <div className="py-4">
      <div className="flex items-center gap-2 px-4 mb-3">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex gap-3 px-4 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 w-20 flex-shrink-0">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
