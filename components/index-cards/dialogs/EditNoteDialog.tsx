'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EditNoteDialogProps {
  isOpen: boolean;
  currentNote: string | null;
  sceneNumber: number;
  sceneHeading: string;
  onClose: () => void;
  onSave: (note: string | null) => void;
}

export function EditNoteDialog({
  isOpen,
  currentNote,
  sceneNumber,
  sceneHeading,
  onClose,
  onSave,
}: EditNoteDialogProps) {
  const [note, setNote] = useState(currentNote || '');

  useEffect(() => {
    if (isOpen) {
      setNote(currentNote || '');
    }
  }, [isOpen, currentNote]);

  const handleSave = () => {
    const trimmed = note.trim();
    onSave(trimmed || null);
    onClose();
  };

  const handleClear = () => {
    onSave(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {currentNote ? 'Edit Note' : 'Add Note'}
          </DialogTitle>
          <DialogDescription>
            Scene {sceneNumber} • {sceneHeading}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="note">Scene Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add notes about this scene..."
              className="min-h-32 resize-y"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Notes are for your reference and won't appear in the exported screenplay.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between">
          <div>
            {currentNote && (
              <Button variant="destructive" onClick={handleClear}>
                Clear Note
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
