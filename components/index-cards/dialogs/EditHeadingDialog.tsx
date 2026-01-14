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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditHeadingDialogProps {
  isOpen: boolean;
  currentHeading: string;
  sceneNumber: number;
  onClose: () => void;
  onSave: (newHeading: string) => void;
}

export function EditHeadingDialog({
  isOpen,
  currentHeading,
  sceneNumber,
  onClose,
  onSave,
}: EditHeadingDialogProps) {
  const [heading, setHeading] = useState(currentHeading);

  useEffect(() => {
    if (isOpen) {
      setHeading(currentHeading);
    }
  }, [isOpen, currentHeading]);

  const handleSave = () => {
    const trimmed = heading.trim();
    if (trimmed && trimmed !== currentHeading) {
      onSave(trimmed);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Scene Heading</DialogTitle>
          <DialogDescription>
            Scene {sceneNumber} - Update the scene heading
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="heading">Scene Heading</Label>
            <Input
              id="heading"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="INT. LOCATION - DAY"
              className="font-mono uppercase"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
