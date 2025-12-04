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
import type { RemoteUser } from '@/types/collaboration';
import { Users, Wifi, WifiOff } from 'lucide-react';

export interface CollaborationAvatarsProps {
  remoteUsers: RemoteUser[];
  isConnected: boolean;
  className?: string;
  maxAvatars?: number;
}

export function CollaborationAvatars({
  remoteUsers,
  isConnected,
  className,
  maxAvatars = 5,
}: CollaborationAvatarsProps) {
  const visibleUsers = remoteUsers.slice(0, maxAvatars);
  const extraCount = Math.max(0, remoteUsers.length - maxAvatars);

  if (remoteUsers.length === 0 && !isConnected) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Connection Status */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full',
                isConnected
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-red-500/10 text-red-600'
              )}
            >
              {isConnected ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isConnected ? 'Connected' : 'Disconnected'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Active Users */}
      {remoteUsers.length > 0 && (
        <>
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
                      <div className="text-muted-foreground">
                        {user.editorType === 'prosemirror' ? 'Modern' : 'Classic'} Editor
                      </div>
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
        </>
      )}
    </div>
  );
}
