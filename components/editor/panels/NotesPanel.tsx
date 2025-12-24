'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CiStickyNote } from 'react-icons/ci';
import {
  Plus,
  Search,
  X,
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PanelHeader } from './PanelHeader';

export interface Note {
  id: string;
  content: string;
  sceneId?: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface NotesPanelProps {
  screenplayId: string;
  currentSceneId?: string;
  className?: string;
}

// Sortable note item component
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

function SortableNoteItem({
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
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <MoreHorizontal className="h-3 w-3" />
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
}

/**
 * Notes panel with auto-save functionality.
 * Shows screenplay notes with optional scene linking.
 */
export function NotesPanel({
  screenplayId,
  currentSceneId,
  className,
}: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      try {
        // Try localStorage first for immediate display
        const localData = localStorage.getItem(`screenplay-notes-${screenplayId}`);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            setNotes(parsed.map((n: Note) => ({
              ...n,
              createdAt: new Date(n.createdAt),
              updatedAt: new Date(n.updatedAt),
            })));
          } catch (e) {
            console.error('Failed to parse notes from localStorage:', e);
          }
        }

        // Then try API
        const res = await fetch(`/api/screenplays/${screenplayId}/notes`);
        if (res.ok) {
          const data = await res.json();
          if (data.notes) {
            const apiNotes = data.notes.map((n: Note) => ({
              ...n,
              createdAt: new Date(n.createdAt),
              updatedAt: new Date(n.updatedAt),
            }));
            setNotes(apiNotes);
            localStorage.setItem(
              `screenplay-notes-${screenplayId}`,
              JSON.stringify(apiNotes)
            );
          }
        }
      } catch (e) {
        console.error('Failed to load notes:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, [screenplayId]);

  // Save notes to localStorage and API
  const saveNotes = useCallback(
    async (updatedNotes: Note[]) => {
      // Save to localStorage immediately
      localStorage.setItem(
        `screenplay-notes-${screenplayId}`,
        JSON.stringify(updatedNotes)
      );

      // Debounce API save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/screenplays/${screenplayId}/notes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: updatedNotes }),
          });
        } catch (e) {
          console.error('Failed to save notes to API:', e);
        }
      }, 1000);
    },
    [screenplayId]
  );

  const handleAddNote = useCallback(() => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      content: '',
      sceneId: currentSceneId,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    setEditingNoteId(newNote.id);
    setEditContent('');
    saveNotes(updatedNotes);
  }, [notes, currentSceneId, saveNotes]);

  const handleSaveEdit = useCallback(() => {
    if (!editingNoteId) return;

    const updatedNotes = notes.map((note) =>
      note.id === editingNoteId
        ? { ...note, content: editContent.trim(), updatedAt: new Date() }
        : note
    );

    // Remove empty notes
    const filteredNotes = updatedNotes.filter(
      (note) => note.content.trim() !== '' || note.id === editingNoteId
    );

    setNotes(filteredNotes);
    setEditingNoteId(null);
    setEditContent('');
    saveNotes(filteredNotes);
  }, [editingNoteId, editContent, notes, saveNotes]);

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      const updatedNotes = notes.filter((note) => note.id !== noteId);
      setNotes(updatedNotes);
      saveNotes(updatedNotes);
    },
    [notes, saveNotes]
  );

  const handleTogglePin = useCallback(
    (noteId: string) => {
      const updatedNotes = notes.map((note) =>
        note.id === noteId
          ? { ...note, isPinned: !note.isPinned, updatedAt: new Date() }
          : note
      );
      setNotes(updatedNotes);
      saveNotes(updatedNotes);
    },
    [notes, saveNotes]
  );

  const startEditing = useCallback((note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  }, []);

  // Filter and sort notes
  const filteredNotes = notes
    .filter((note) =>
      !searchQuery ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Pinned first, then by date
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

  const formatDate = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }, []);

  // Duplicate note handler
  const handleDuplicateNote = useCallback(
    (note: Note) => {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        content: note.content,
        sceneId: note.sceneId,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedNotes = [newNote, ...notes];
      setNotes(updatedNotes);
      saveNotes(updatedNotes);
    },
    [notes, saveNotes]
  );

  // Sensors for drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - log reorder for now
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredNotes.findIndex(n => n.id === active.id);
      const newIndex = filteredNotes.findIndex(n => n.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // TODO: Implement actual note reordering persistence
      }
    }
  }, [filteredNotes]);

  return (
    <div className={cn('flex flex-col overflow-hidden', className)}>
      <PanelHeader
        title="Notes"
        count={notes.length}
        onAdd={handleAddNote}
        addLabel="Add note"
      />

      {/* Content */}
      {isLoading ? (
        <div className="p-4 space-y-3 animate-pulse">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-20 w-full rounded-md bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm p-3">
          <CiStickyNote className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No notes yet</p>
          <p className="text-xs mt-1">
            Add notes to keep track of ideas.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={handleAddNote}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add note
          </Button>
        </div>
      ) : (
        <>
          {/* Search */}
          {notes.length > 3 && (
            <div className="p-3 border-b border-border shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-8 text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Notes list with Drag & Drop */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-1.5">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  No notes match your search.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredNotes.map(n => n.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredNotes.map((note) => (
                      <SortableNoteItem
                        key={note.id}
                        note={note}
                        editingNoteId={editingNoteId}
                        editContent={editContent}
                        setEditContent={setEditContent}
                        setEditingNoteId={setEditingNoteId}
                        startEditing={startEditing}
                        handleSaveEdit={handleSaveEdit}
                        handleTogglePin={handleTogglePin}
                        handleDeleteNote={handleDeleteNote}
                        handleDuplicateNote={handleDuplicateNote}
                        formatDate={formatDate}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
