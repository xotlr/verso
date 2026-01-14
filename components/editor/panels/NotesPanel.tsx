'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { CiStickyNote } from 'react-icons/ci';
import { Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PanelContainer } from './PanelContainer';
import { PanelSearch } from './PanelSearch';
import { PanelSkeleton } from './PanelSkeleton';
import { usePanelDndSensors } from './use-panel-dnd';
import { SortableNoteItem } from './SortableNoteItem';

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

/**
 * Notes panel with auto-save functionality.
 * Shows screenplay notes with optional scene linking.
 */
function NotesPanelInner({
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

  // DnD sensors (shared configuration)
  const sensors = usePanelDndSensors();

  // Handle drag end - log reorder for now
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredNotes.findIndex(n => n.id === active.id);
      const newIndex = filteredNotes.findIndex(n => n.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Note reordering requires API endpoint - visual feedback only for now
      }
    }
  }, [filteredNotes]);

  return (
    <PanelContainer className={className}>
      {/* Loading state */}
      {isLoading ? (
        <PanelSkeleton variant="notes" />
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
            <div className="p-3 shrink-0">
              <PanelSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search notes..."
              />
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
    </PanelContainer>
  );
}

export const NotesPanel = React.memo(NotesPanelInner);
