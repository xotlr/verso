'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { Save, Loader2 } from 'lucide-react';

interface SaveVersionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (message?: string) => void | Promise<void>;
  isSaving?: boolean;
}

export function SaveVersionDialog({
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}: SaveVersionDialogProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Clear message when dialog opens and focus textarea
  useEffect(() => {
    if (isOpen) {
      setMessage('');
      // Focus the textarea after a short delay to ensure dialog is rendered
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSave = async () => {
    await onSave(message.trim() || undefined);
    setMessage('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to save
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Version
          </DialogTitle>
          <DialogDescription>
            Add a note describing what changed in this version (optional).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="version-message">Version notes</Label>
            <Textarea
              ref={textareaRef}
              id="version-message"
              placeholder="e.g., Added ending scene, Polished dialogue in Act 2, Fixed character names..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] resize-none"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Press {navigator.platform?.includes('Mac') ? 'Cmd' : 'Ctrl'} + Enter to save quickly
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Version
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
