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
import { Smile, Frown, Zap, Heart, Skull, Sparkles } from 'lucide-react';

interface EditMoodDialogProps {
  isOpen: boolean;
  currentMood: string | null;
  sceneNumber: number;
  sceneHeading: string;
  onClose: () => void;
  onSave: (mood: string | null) => void;
}

const MOOD_PRESETS = [
  { value: 'tense', label: 'Tense', icon: Zap, color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  { value: 'romantic', label: 'Romantic', icon: Heart, color: 'bg-pink-500/10 text-pink-700 dark:text-pink-400' },
  { value: 'action', label: 'Action', icon: Zap, color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  { value: 'suspenseful', label: 'Suspenseful', icon: Skull, color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
  { value: 'uplifting', label: 'Uplifting', icon: Sparkles, color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  { value: 'sad', label: 'Sad', icon: Frown, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  { value: 'comedic', label: 'Comedic', icon: Smile, color: 'bg-green-500/10 text-green-700 dark:text-green-400' },
];

export function EditMoodDialog({
  isOpen,
  currentMood,
  sceneNumber,
  sceneHeading,
  onClose,
  onSave,
}: EditMoodDialogProps) {
  const [mood, setMood] = useState(currentMood || '');

  useEffect(() => {
    if (isOpen) {
      setMood(currentMood || '');
    }
  }, [isOpen, currentMood]);

  const handleSave = () => {
    const trimmed = mood.trim();
    onSave(trimmed || null);
    onClose();
  };

  const handleClear = () => {
    onSave(null);
    onClose();
  };

  const handlePresetClick = (preset: string) => {
    setMood(preset);
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
          <DialogTitle>
            {currentMood ? 'Edit Mood' : 'Set Mood'}
          </DialogTitle>
          <DialogDescription>
            Scene {sceneNumber} • {sceneHeading}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Presets */}
          <div className="space-y-2">
            <Label>Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {MOOD_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <Badge
                    key={preset.value}
                    variant="outline"
                    className={`cursor-pointer transition-all ${
                      mood.toLowerCase() === preset.value
                        ? preset.color
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => handlePresetClick(preset.value)}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {preset.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Custom input */}
          <div className="space-y-2">
            <Label htmlFor="mood">Custom Mood</Label>
            <Input
              id="mood"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., mysterious, chaotic, peaceful"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between">
          <div>
            {currentMood && (
              <Button variant="destructive" onClick={handleClear}>
                Clear Mood
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
