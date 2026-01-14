'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  GripVertical,
  Copy,
  MessageSquare,
  Play,
  Clipboard,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CharacterInfo } from '@/hooks/editor/use-prosemirror-editor';
import type { CharacterRole } from '@/hooks/panels/use-character-roles';

// Role label mapping
const getRoleLabel = (role: CharacterRole): string => {
  switch (role) {
    case 'Protagonist': return 'LEAD';
    case 'Antagonist': return 'ANTAG';
    case 'Supporting': return 'SUPPORT';
    case 'Minor': return 'MINOR';
  }
};

export interface SortableCharacterItemProps {
  char: CharacterInfo;
  index: number;
  role: CharacterRole;
  isProtagonist: boolean;
  cycleRole: (charId: string) => void;
  onGoToFirstAppearance: (charName: string) => void;
  onGoToFirstDialogue: (charName: string) => void;
  onCopyName: (charName: string) => void;
}

/**
 * Sortable character item with drag handle, avatar, role badge, and actions menu.
 * Extracted from CharactersPanel for better modularity.
 */
export const SortableCharacterItem = React.memo(function SortableCharacterItem({
  char,
  index,
  role,
  isProtagonist,
  cycleRole,
  onGoToFirstAppearance,
  onGoToFirstDialogue,
  onCopyName,
}: SortableCharacterItemProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: char.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'px-2.5 py-2 rounded-lg transition-all duration-150 group',
        isProtagonist
          ? 'bg-primary text-primary-foreground hover:-translate-y-0.5 hover:shadow-md'
          : 'hover:bg-accent/50 hover:-translate-y-0.5 hover:shadow-sm',
        isDragging && 'bg-accent shadow-lg'
      )}
    >
      <div className="flex items-center gap-1.5">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Reorder ${char.name}`}
          aria-describedby="character-drag-instructions"
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Character info with navigation popover */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer hover:opacity-80 transition-opacity">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className={cn(
                  'h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold',
                  isProtagonist
                    ? 'bg-primary-foreground text-primary'
                    : 'bg-foreground/10 text-foreground'
                )}>
                  {char.name.charAt(0)}
                </div>
                {/* Rank indicator for top 3 */}
                {index < 3 && (
                  <div className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-md flex items-center justify-center text-[9px] font-bold border',
                    isProtagonist
                      ? 'bg-primary-foreground text-primary border-primary'
                      : index === 0
                        ? 'bg-primary text-primary-foreground border-card'
                        : 'bg-muted text-muted-foreground border-card'
                  )}>
                    {index + 1}
                  </div>
                )}
              </div>

              {/* Name and line count */}
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  'font-medium text-xs break-words',
                  isProtagonist && 'text-primary-foreground'
                )}>
                  {char.name}
                </h4>
                <span className={cn(
                  'text-[10px]',
                  isProtagonist ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}>
                  {char.dialogueCount} lines
                </span>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start">
            <button
              onClick={() => {
                onGoToFirstAppearance(char.name);
                setPopoverOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              First appearance
            </button>
            <button
              onClick={() => {
                onGoToFirstDialogue(char.name);
                setPopoverOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              First dialogue
            </button>
          </PopoverContent>
        </Popover>

        {/* Role badge */}
        <button
          onClick={() => cycleRole(char.id)}
          className={cn(
            'text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-all hover:opacity-80 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary',
            isProtagonist
              ? 'bg-primary-foreground text-primary'
              : role === 'Antagonist'
                ? 'bg-destructive/15 text-destructive'
                : 'bg-muted text-muted-foreground'
          )}
          aria-label={`${char.name} role: ${role}. Click to change.`}
        >
          {getRoleLabel(role)}
        </button>

        {/* Actions menu */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100',
                  isProtagonist && 'text-primary-foreground hover:bg-primary-foreground/20'
                )}
                aria-label={`More options for ${char.name}`}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onGoToFirstAppearance(char.name)}>
                <Play className="h-3.5 w-3.5 mr-2" />
                Go to first appearance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGoToFirstDialogue(char.name)}>
                <MessageSquare className="h-3.5 w-3.5 mr-2" />
                Go to first dialogue
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onCopyName(char.name)}>
                <Clipboard className="h-3.5 w-3.5 mr-2" />
                Copy name
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit2 className="h-3.5 w-3.5 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Merge with...
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Remove from script
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});
