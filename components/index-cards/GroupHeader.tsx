'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Layers, MoreHorizontal, Palette, Trash2, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CardGroup } from '@/types/index-cards';
import { GROUP_COLORS, type GroupColor } from '@/types/index-cards';

interface GroupHeaderProps {
  group: CardGroup;
  cardCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRename: (newName: string) => void;
  onChangeColor: (color: GroupColor) => void;
  onUngroup: () => void;
  onDelete?: () => void;
}

// Color palette for group customization
const COLOR_OPTIONS: Array<{ value: GroupColor; label: string; class: string }> = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'fuchsia', label: 'Fuchsia', class: 'bg-fuchsia-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'rose', label: 'Rose', class: 'bg-rose-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'lime', label: 'Lime', class: 'bg-lime-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'sky', label: 'Sky', class: 'bg-sky-500' },
  { value: 'slate', label: 'Slate', class: 'bg-slate-500' },
];

export function GroupHeader({
  group,
  cardCount,
  isCollapsed,
  onToggleCollapse,
  onRename,
  onChangeColor,
  onUngroup,
  onDelete,
}: GroupHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCustomGroup = group.type === 'custom';
  const isActGroup = group.type === 'act';

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (isCustomGroup) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    if (isEditing) {
      const trimmed = editValue.trim();
      if (trimmed && trimmed !== group.name) {
        onRename(trimmed);
      } else {
        setEditValue(group.name);
      }
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(group.name);
      setIsEditing(false);
    }
  };

  // Get color class for the group
  const getColorClass = (color?: string) => {
    if (!color) return 'bg-blue-500/10 border-blue-500/20';
    return `bg-${color}-500/10 border-${color}-500/20`;
  };

  const getTextColorClass = (color?: string) => {
    if (!color) return 'text-blue-700 dark:text-blue-400';
    return `text-${color}-700 dark:text-${color}-400`;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 border-b transition-colors',
        isCustomGroup && group.color && getColorClass(group.color),
        isActGroup && 'bg-blue-500/5 border-blue-500/15',
        'hover:bg-accent/50'
      )}
    >
      {/* Collapse/Expand Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleCollapse}
        className="h-7 w-7 p-0 hover:bg-accent"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {/* Group Icon */}
      {isCustomGroup ? (
        <FolderOpen
          className={cn('h-4 w-4', group.color && getTextColorClass(group.color))}
        />
      ) : (
        <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      )}

      {/* Group Name (Editable for custom groups) */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex-1 bg-transparent border-b border-foreground/30',
            'focus:outline-none focus:border-foreground/60',
            'text-sm font-medium'
          )}
        />
      ) : (
        <button
          onDoubleClick={handleDoubleClick}
          className={cn(
            'flex-1 text-left text-sm font-medium',
            isCustomGroup && 'cursor-text hover:underline decoration-dotted'
          )}
        >
          {group.name}
        </button>
      )}

      {/* Card Count Badge */}
      <Badge variant="secondary" className="text-xs">
        {cardCount}
      </Badge>

      {/* Act Badge */}
      {isActGroup && (
        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-700 dark:text-blue-400">
          Act
        </Badge>
      )}

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Rename (custom groups only) */}
          {isCustomGroup && (
            <>
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Type className="mr-2 h-4 w-4" />
                Rename Group
              </DropdownMenuItem>

              {/* Change Color */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                    <Palette className="mr-2 h-4 w-4" />
                    Change Color
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="left" className="w-40">
                  <div className="grid grid-cols-3 gap-1 p-2">
                    {COLOR_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onChangeColor(option.value)}
                        className={cn(
                          'h-8 w-8 rounded-md border-2 transition-all',
                          option.class,
                          group.color === option.value
                            ? 'border-foreground ring-2 ring-offset-2 ring-foreground/20'
                            : 'border-transparent hover:border-foreground/30'
                        )}
                        title={option.label}
                      />
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenuSeparator />
            </>
          )}

          {/* Ungroup All */}
          <DropdownMenuItem onClick={onUngroup}>
            <Layers className="mr-2 h-4 w-4" />
            Ungroup All Cards
          </DropdownMenuItem>

          {/* Delete (custom groups only) */}
          {isCustomGroup && onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Group
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
