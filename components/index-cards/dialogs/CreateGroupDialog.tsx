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
import { Badge } from '@/components/ui/badge';
import { GROUP_COLORS, type GroupColor } from '@/types/index-cards';

interface CreateGroupDialogProps {
  isOpen: boolean;
  cardCount: number;
  onClose: () => void;
  onSave: (name: string, color: GroupColor) => void;
}

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
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
];

export function CreateGroupDialog({
  isOpen,
  cardCount,
  onClose,
  onSave,
}: CreateGroupDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<GroupColor>('blue');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setColor('blue');
    }
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onSave(trimmed, color);
      onClose();
    }
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
          <DialogTitle>Create Card Group</DialogTitle>
          <DialogDescription>
            Creating a group with {cardCount} {cardCount === 1 ? 'card' : 'cards'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Group name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Climax, Flashbacks, Opening Sequence"
              autoFocus
            />
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Group Color</Label>
            <div className="grid grid-cols-7 gap-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setColor(option.value)}
                  className={`
                    h-10 w-10 rounded-md border-2 transition-all
                    ${option.class}
                    ${
                      color === option.value
                        ? 'border-foreground ring-2 ring-offset-2 ring-foreground/20 scale-110'
                        : 'border-transparent hover:border-foreground/30 hover:scale-105'
                    }
                  `}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className={`rounded-lg border-2 border-${color}-500/20 bg-${color}-500/10 p-4`}>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full bg-${color}-500`} />
                <span className="font-medium text-sm">
                  {name || 'Group Name'}
                </span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {cardCount}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
