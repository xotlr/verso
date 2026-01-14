'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  MoreHorizontal,
  Trash2,
  Pin,
  Check,
  GripVertical,
  Copy,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Note } from './NotesPanel';

interface SortableNoteItemProps {
  note: Note;
  editingNoteId: string | null;
  editContent: string;
  setEditContent: (content: string) => void;
  setEditingNoteId: (id: string | null) => void;
  startEditing: (note: Note) => void;
  handleSaveEdit: () => void;
  handleTogglePin: (noteId: string) => void;
  handleDeleteNote: (noteId: string) => void;
  handleDuplicateNote: (note: Note) => void;
  formatDate: (date: Date) => string;
}

export const SortableNoteItem = React.memo(function SortableNoteItem({
  note,
  editingNoteId,
  editContent,
  setEditContent,
  setEditingNoteId,
  startEditing,
  handleSaveEdit,
  handleTogglePin,
  handleDeleteNote,
  handleDuplicateNote,
  formatDate,
}: SortableNoteItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

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
        'p-2 rounded-lg border transition-colors group',
        note.isPinned
          ? 'bg-primary/5 border-primary/20'
          : 'hover:bg-accent/30',
        isDragging && 'bg-accent shadow-lg'
      )}
    >
      {editingNoteId === note.id ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Write your note..."
            className="min-h-[80px] text-xs resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => {
                setEditingNoteId(null);
                setEditContent('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-6 text-xs"
              onClick={handleSaveEdit}
            >
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2">
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="shrink-0 pt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>

            <button
              onClick={() => startEditing(note)}
              className="flex-1 text-left min-w-0"
            >
              <p className="text-xs whitespace-pre-wrap break-words">
                {note.content || (
                  <span className="text-muted-foreground italic">
                    Empty note - click to edit
                  </span>
                )}
              </p>
            </button>

            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    onClick={() => handleTogglePin(note.id)}
                  >
                    <Pin className="h-3.5 w-3.5 mr-2" />
                    {note.isPinned ? 'Unpin' : 'Pin'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDuplicateNote(note)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5 ml-5">
            {note.isPinned && (
              <Pin className="h-2.5 w-2.5 text-primary" />
            )}
            <span className="text-[10px] text-muted-foreground">
              {formatDate(note.updatedAt)}
            </span>
          </div>
        </>
      )}
    </div>
  );
});
