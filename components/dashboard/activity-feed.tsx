'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Film, Folder, Edit3, Globe } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Activity {
  id: string;
  type: string;
  entityId: string | null;
  entityTitle: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const activityConfig: Record<string, { icon: typeof Film; verb: string; color: string }> = {
  screenplay_created: {
    icon: Film,
    verb: 'Created screenplay',
    color: 'text-blue-500',
  },
  screenplay_edited: {
    icon: Edit3,
    verb: 'Edited screenplay',
    color: 'text-green-500',
  },
  project_created: {
    icon: Folder,
    verb: 'Created project',
    color: 'text-purple-500',
  },
  screenplay_published: {
    icon: Globe,
    verb: 'Published screenplay',
    color: 'text-orange-500',
  },
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Recent Activity</h3>
        <div className="text-sm text-muted-foreground py-8 text-center">
          No activity yet. Start writing!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Recent Activity</h3>
      <ScrollArea className="h-[280px]">
        <div className="space-y-3 pr-4">
          {activities.map((activity) => {
            const config = activityConfig[activity.type] || {
              icon: Film,
              verb: activity.type,
              color: 'text-muted-foreground',
            };
            const Icon = config.icon;

            const href = activity.type.startsWith('project')
              ? `/project/${activity.entityId}`
              : `/screenplay/${activity.entityId}`;

            return (
              <Link
                key={activity.id}
                href={href}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={`p-1.5 rounded-md bg-muted ${config.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="text-muted-foreground">{config.verb}</span>{' '}
                    <span className="font-medium truncate">
                      {activity.entityTitle || 'Untitled'}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
