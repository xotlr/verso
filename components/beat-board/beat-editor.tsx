'use client';

import React, { useState, useEffect } from 'react';
import { Scene } from '@/types/screenplay';
import { Beat } from '@/types/beat-board';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Check, X, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BeatEditorProps {
  beat: Beat | null;
  scenes: Scene[];
  isOpen: boolean;
  onSave: (beat: Beat) => void;
  onCancel: () => void;
  beatColors: string[];
}

export function BeatEditor({
  beat,
  scenes,
  isOpen,
  onSave,
  onCancel,
  beatColors,
}: BeatEditorProps) {
  const [title, setTitle] = useState(beat?.title || '');
  const [description, setDescription] = useState(beat?.description || '');
  const [color, setColor] = useState(beat?.color || beatColors[0]);
  const [selectedScenes, setSelectedScenes] = useState<string[]>(beat?.sceneIds || []);
  const [showCustomColor, setShowCustomColor] = useState(false);

  // Check if current color is a custom color (not in the preset list)
  const isCustomColor = color && !beatColors.includes(color);

  // Reset form when beat changes
  useEffect(() => {
    setTitle(beat?.title || '');
    setDescription(beat?.description || '');
    setColor(beat?.color || beatColors[0]);
    setSelectedScenes(beat?.sceneIds || []);
    // Show custom picker if the beat has a custom color
    setShowCustomColor(beat?.color ? !beatColors.includes(beat.color) : false);
  }, [beat, beatColors]);

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      id: beat?.id || `beat-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      color,
      act: beat?.act || 'act1',
      sceneIds: selectedScenes,
      order: beat?.order || 0,
    });
  };

  const toggleScene = (sceneId: string) => {
    setSelectedScenes(prev =>
      prev.includes(sceneId)
        ? prev.filter(id => id !== sceneId)
        : [...prev, sceneId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{beat?.id ? 'Edit Beat' : 'New Beat'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Beat title..."
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happens in this beat..."
              className="mt-1 h-20 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {beatColors.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setShowCustomColor(false);
                  }}
                  className={cn(
                    'w-6 h-6 rounded-full transition-transform',
                    color === c && !isCustomColor && 'ring-2 ring-offset-2 ring-primary scale-110'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              {/* Custom color button */}
              <button
                onClick={() => setShowCustomColor(!showCustomColor)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 border-dashed transition-transform flex items-center justify-center',
                  (showCustomColor || isCustomColor)
                    ? 'border-primary ring-2 ring-offset-2 ring-primary scale-110'
                    : 'border-muted-foreground/50 hover:border-muted-foreground'
                )}
                style={isCustomColor ? { backgroundColor: color } : undefined}
              >
                {!isCustomColor && <Plus className="h-3 w-3 text-muted-foreground" />}
              </button>
            </div>
            {/* Custom color picker */}
            {showCustomColor && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-xs text-muted-foreground font-mono">{color.toUpperCase()}</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Link Scenes</label>
            <ScrollArea className="mt-1 max-h-32 border rounded-md p-2">
              {scenes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No scenes available</p>
              ) : (
                scenes.map(scene => (
                  <button
                    key={scene.id}
                    onClick={() => toggleScene(scene.id)}
                    className={cn(
                      'w-full text-left px-2 py-1 rounded text-sm',
                      selectedScenes.includes(scene.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    Scene {scene.number}: {scene.heading.substring(0, 30)}...
                  </button>
                ))
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            <Check className="h-4 w-4 mr-2" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
