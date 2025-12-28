/**
 * CollaborationAvatars Component
 *
 * Shows avatars of users currently collaborating on a screenplay
 */

'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

/**
 * Minimal user type for collaboration avatars.
 * Works with both legacy RemoteUser and Yjs RemoteYjsUser types.
 */
export interface CollaboratorUser {
  id: string;
  name: string;
  color: string;
  image?: string | null;
}

export interface CollaborationAvatarsProps {
  remoteUsers: CollaboratorUser[];
  isConnected: boolean;
  className?: string;
  maxAvatars?: number;
}

export function CollaborationAvatars({
  remoteUsers,
  isConnected: _isConnected,
  className,
  maxAvatars = 5,
}: CollaborationAvatarsProps) {
  const visibleUsers = remoteUsers.slice(0, maxAvatars);
  const extraCount = Math.max(0, remoteUsers.length - maxAvatars);

  // Only show if there are remote users collaborating
  if (remoteUsers.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Active Users */}
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <TooltipProvider key={user.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className="w-8 h-8 border-2 border-background ring-2 transition-all hover:scale-110 cursor-pointer"
                    style={{ borderColor: user.color }}
                  >
                    <AvatarImage src={user.image || undefined} alt={user.name} />
                    <AvatarFallback
                      className="text-xs font-medium text-white"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Online indicator */}
                  <div
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background"
                    style={{ backgroundColor: user.color }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-muted-foreground">Editing</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {/* Extra users count */}
        {extraCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted border-2 border-background text-xs font-medium">
                  +{extraCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {extraCount} more {extraCount === 1 ? 'user' : 'users'} editing
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* User count text */}
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Users className="w-3 h-3" />
        <span>
          {remoteUsers.length} {remoteUsers.length === 1 ? 'user' : 'users'}
        </span>
      </div>
    </div>
  );
}
