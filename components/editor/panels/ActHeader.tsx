'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  MoreHorizontal,
  Pencil,
  Ungroup,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Act {
  id: string;
  name: string;
  scenes: Array<{ id: string }>;
}

interface ActHeaderProps {
  act: Act;
  isExpanded: boolean;
  isEditing: boolean;
  editingName: string;
  displayName: string;
  onToggle: () => void;
  onStartEditing: (e: React.MouseEvent) => void;
  onEditingNameChange: (name: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onUngroup: () => void;
}

export function ActHeader({
  act,
  isExpanded,
  isEditing,
  editingName,
  displayName,
  onToggle,
  onStartEditing,
  onEditingNameChange,
  onSaveEdit,
  onCancelEdit,
  onUngroup,
}: ActHeaderProps) {
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus and select input when editing starts
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      className={cn(
        'w-full flex items-center justify-between',
        'px-2 py-1 rounded-md',
        'text-[11px] font-medium',
        'hover:bg-accent/50',
        'transition-colors',
        'group/act'
      )}
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <button onClick={onToggle} className="shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
        <Clapperboard className="h-3 w-3 text-muted-foreground shrink-0" />

        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            className={cn(
              'bg-transparent border-b border-primary outline-none',
              'text-xs font-medium min-w-0 flex-1',
              'px-0.5'
            )}
            autoFocus
          />
        ) : (
          <button
            onClick={onToggle}
            onDoubleClick={onStartEditing}
            className="truncate text-left flex-1 min-w-0"
            title="Double-click to rename"
          >
            {displayName}
          </button>
        )}

        <span className="text-[10px] text-muted-foreground font-normal shrink-0">
          ({act.scenes.length})
        </span>
      </div>

      {/* Act actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover/act:opacity-100 transition-opacity shrink-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onStartEditing}>
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onUngroup} className="text-destructive">
            <Ungroup className="h-3.5 w-3.5 mr-2" />
            Ungroup
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
