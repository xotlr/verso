'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HiRectangleGroup, HiOutlineRectangleGroup } from 'react-icons/hi2';
import { PiFilmScript } from 'react-icons/pi';
import { MoreVertical, Pencil, Check, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// Minimal screenplay data for stack display
interface StackScreenplay {
  id: string;
  title: string;
  wordCount?: number;
  updatedAt?: string;
}

export interface StackDialogData {
  id: string;
  name: string;
  updatedAt: string;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  screenplays?: StackScreenplay[];
  _count?: { screenplays: number };
}

interface StackDialogProps {
  stack: StackDialogData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (stackId: string, name: string) => void;
  onUngroup: (stackId: string) => void;
  onRemoveFromStack: (screenplayId: string, stackId: string) => void;
}

// Format word count compactly
function formatWordCount(count?: number): string {
  if (!count) return '0';
  if (count >= 1000) {
    const k = Math.floor((count / 1000) * 10) / 10;
    return `${k.toFixed(1)}k`;
  }
  return count.toString();
}

// Simple screenplay card for the dialog grid
function ScreenplayGridCard({
  screenplay,
  onOpen,
  onRemove,
}: {
  screenplay: StackScreenplay;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        'group relative flex flex-col',
        'bg-card rounded-lg',
        'border border-border/60',
        'hover:border-border hover:shadow-md',
        'transition-all duration-200',
        'cursor-pointer overflow-hidden',
        'min-h-[120px]'
      )}
    >
      <button onClick={onOpen} className="flex-1 flex flex-col text-left p-4">
        {/* Type badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className="badge-primary">
            <PiFilmScript className="h-2.5 w-2.5" />
            SCRIPT
          </span>
        </div>

        {/* Title */}
        <h4 className="font-bold uppercase tracking-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors text-sm">
          {screenplay.title}
        </h4>

        {/* Word count */}
        {screenplay.wordCount !== undefined && (
          <p className="text-[10px] text-muted-foreground mt-auto pt-2 uppercase tracking-wide">
            {formatWordCount(screenplay.wordCount)} words
          </p>
        )}
      </button>

      {/* Actions menu */}
      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
              <X className="mr-2 h-4 w-4" />
              Remove from Stack
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function StackDialog({
  stack,
  open,
  onOpenChange,
  onRename,
  onUngroup,
  onRemoveFromStack,
}: StackDialogProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  if (!stack) return null;

  const screenplays = stack.screenplays || [];
  const screenplayCount = stack._count?.screenplays || screenplays.length;

  const handleStartEdit = () => {
    setEditName(stack.name);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editName.trim() && editName !== stack.name) {
      onRename(stack.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName('');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleOpenScreenplay = (id: string) => {
    onOpenChange(false);
    router.push(`/editor/${id}`);
  };

  const handleUngroup = () => {
    onUngroup(stack.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Type badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider bg-secondary/80 text-secondary-foreground border border-border/40">
                  <HiRectangleGroup className="h-3.5 w-3.5" />
                  STACK
                </span>
                <span className="text-xs text-muted-foreground">
                  {screenplayCount} {screenplayCount === 1 ? 'script' : 'scripts'}
                </span>
              </div>

              {/* Editable title */}
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="text-lg font-bold"
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <DialogTitle className="flex items-center gap-2 text-xl font-bold uppercase tracking-tight">
                  {stack.name}
                  <button
                    onClick={handleStartEdit}
                    className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Rename stack"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </DialogTitle>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content - scrollable grid of screenplay cards */}
        <ScrollArea className="flex-1 p-4 sm:p-6 pt-4">
          {screenplays.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {screenplays.map((screenplay) => (
                <ScreenplayGridCard
                  key={screenplay.id}
                  screenplay={screenplay}
                  onOpen={() => handleOpenScreenplay(screenplay.id)}
                  onRemove={() => onRemoveFromStack(screenplay.id, stack.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <HiOutlineRectangleGroup className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No scripts in this stack</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border p-4 sm:p-6 pt-4 sm:pt-4">
          <Button
            variant="outline"
            onClick={handleUngroup}
            className="w-full"
          >
            <HiOutlineRectangleGroup className="mr-2 h-4 w-4" />
            Ungroup All Scripts
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
