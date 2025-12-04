/**
 * RemoteCursor Component
 *
 * Shows a remote user's cursor position in the editor
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { RemoteUser } from '@/types/collaboration';

export interface RemoteCursorProps {
  user: RemoteUser;
  top: number;
  left: number;
  className?: string;
}

export function RemoteCursor({ user, top, left, className }: RemoteCursorProps) {
  return (
    <div
      className={cn('absolute pointer-events-none z-50 transition-all duration-150', className)}
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      {/* Cursor line */}
      <div
        className="w-0.5 h-5 animate-pulse"
        style={{ backgroundColor: user.color }}
      />

      {/* User label */}
      <div
        className="absolute top-0 left-1 px-1.5 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-sm"
        style={{ backgroundColor: user.color }}
      >
        {user.name}
      </div>
    </div>
  );
}

export interface RemoteCursorsProps {
  users: RemoteUser[];
  getCursorPosition?: (user: RemoteUser) => { top: number; left: number } | null;
  className?: string;
}

/**
 * Container component for multiple remote cursors
 */
export function RemoteCursors({ users, getCursorPosition, className }: RemoteCursorsProps) {
  if (!getCursorPosition) return null;

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      {users.map((user) => {
        const position = getCursorPosition(user);
        if (!position) return null;

        return (
          <RemoteCursor
            key={user.id}
            user={user}
            top={position.top}
            left={position.left}
          />
        );
      })}
    </div>
  );
}
