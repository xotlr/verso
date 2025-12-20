'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  MessageSquare,
  Pencil,
  Clock,
  Film,
  Menu,
  UserPlus,
} from 'lucide-react';

type Permission = 'VIEW' | 'COMMENT' | 'EDIT';

interface PublicViewerHeaderProps {
  title: string;
  author: string;
  permission: Permission;
  expiresAt: string | null;
  onRequestAccess: () => void;
  onOpenSceneNav?: () => void;
  className?: string;
}

const PERMISSION_CONFIG: Record<Permission, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' }> = {
  VIEW: {
    label: 'View Only',
    icon: <Eye className="h-3 w-3" />,
    variant: 'secondary',
  },
  COMMENT: {
    label: 'Can Comment',
    icon: <MessageSquare className="h-3 w-3" />,
    variant: 'secondary',
  },
  EDIT: {
    label: 'Can Edit',
    icon: <Pencil className="h-3 w-3" />,
    variant: 'default',
  },
};

export function PublicViewerHeader({
  title,
  author,
  permission,
  expiresAt,
  onRequestAccess,
  onOpenSceneNav,
  className,
}: PublicViewerHeaderProps) {
  const permissionInfo = PERMISSION_CONFIG[permission];

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-11 shrink-0 items-center gap-2 bg-background/95 backdrop-blur-sm border-b border-border px-4',
        className
      )}
    >
      {/* Mobile: Scene nav toggle */}
      {onOpenSceneNav && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 -ml-1"
          onClick={onOpenSceneNav}
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* Title and author */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Film className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
        <div className="min-w-0">
          <h1 className="text-sm font-medium truncate">{title}</h1>
          <p className="text-xs text-muted-foreground truncate hidden sm:block">
            by {author}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Permission badge */}
        <Badge variant={permissionInfo.variant} className="flex items-center gap-1 text-xs">
          {permissionInfo.icon}
          <span className="hidden sm:inline">{permissionInfo.label}</span>
        </Badge>

        {/* Expiration badge */}
        {expiresAt && (
          <Badge variant="outline" className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Expires {new Date(expiresAt).toLocaleDateString()}
          </Badge>
        )}

        {/* Request access button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onRequestAccess}
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Request Access</span>
        </Button>
      </div>
    </header>
  );
}
