'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Scene } from '@/types/screenplay';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Palette,
  StickyNote,
  Image as ImageIcon,
  X,
  Loader2,
  Upload,
  Trash2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadImage, deleteImage, getOptimizedImageUrl } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useVisualizationColors } from '@/lib/visualization-colors';

interface SceneMeta {
  id?: string;
  sceneId: string;
  color: string | null;
  notes: string | null;
  mood: string | null;
}

interface SceneAttachment {
  id: string;
  sceneId: string;
  type: string;
  url: string;
  filename: string | null;
  caption: string | null;
  displayOrder: number;
}

interface SceneWorkspacePanelProps {
  screenplayId: string;
  scene: Scene | null;
  isOpen: boolean;
  onClose: () => void;
  onColorChange?: (sceneId: string, color: string | null) => void;
}

// Color names for display (maps to scene colors from theme)
const COLOR_NAMES = ['Red', 'Orange', 'Yellow', 'Green', 'Teal', 'Blue', 'Purple', 'Pink'];

// Mood presets
const MOOD_PRESETS = [
  'Tense', 'Romantic', 'Action', 'Comedy', 'Drama',
  'Horror', 'Suspense', 'Emotional', 'Peaceful', 'Chaotic',
];

export function SceneWorkspacePanel({
  screenplayId,
  scene,
  isOpen,
  onClose,
  onColorChange,
}: SceneWorkspacePanelProps) {
  const vizColors = useVisualizationColors();
  const [meta, setMeta] = useState<SceneMeta | null>(null);
  const [attachments, setAttachments] = useState<SceneAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build scene colors from theme
  const sceneColors = useMemo(() => {
    return [
      { name: 'None', value: null as string | null },
      ...vizColors.sceneColors.map((color, i) => ({
        name: COLOR_NAMES[i] || `Color ${i + 1}`,
        value: color,
      })),
    ];
  }, [vizColors.sceneColors]);

  // Fetch scene metadata and attachments
  const fetchSceneData = useCallback(async () => {
    if (!scene || !screenplayId) return;

    setLoading(true);
    try {
      const [metaRes, attachmentsRes] = await Promise.all([
        fetch(`/api/screenplays/${screenplayId}/scenes/${scene.id}/meta`),
        fetch(`/api/screenplays/${screenplayId}/scenes/${scene.id}/attachments`),
      ]);

      if (metaRes.ok) {
        const metaData = await metaRes.json();
        setMeta(metaData);
        setNotes(metaData.notes || '');
        setMood(metaData.mood || '');
      }

      if (attachmentsRes.ok) {
        const attachmentsData = await attachmentsRes.json();
        setAttachments(attachmentsData);
      }
    } catch (error) {
      console.error('Error fetching scene data:', error);
    } finally {
      setLoading(false);
    }
  }, [scene, screenplayId]);

  useEffect(() => {
    if (isOpen && scene) {
      fetchSceneData();
    }
  }, [isOpen, scene, fetchSceneData]);

  // Save metadata with debounce
  const saveMeta = useCallback(async (updates: Partial<SceneMeta>) => {
    if (!scene || !screenplayId) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/screenplays/${screenplayId}/scenes/${scene.id}/meta`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setMeta(updated);
      }
    } catch (error) {
      console.error('Error saving scene meta:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [scene, screenplayId]);

  // Debounced notes save
  const handleNotesChange = (value: string) => {
    setNotes(value);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveMeta({ notes: value || null });
    }, 1000);
  };

  // Handle color selection
  const handleColorSelect = (color: string | null) => {
    saveMeta({ color });
    if (onColorChange && scene) {
      onColorChange(scene.id, color);
    }
  };

  // Handle mood selection
  const handleMoodChange = (value: string) => {
    setMood(value);
    saveMeta({ mood: value || null });
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scene) return;

    setUploading(true);
    try {
      // Upload to Supabase
      const url = await uploadImage(file, 'scene-images', screenplayId);

      // Save attachment to database
      const response = await fetch(
        `/api/screenplays/${screenplayId}/scenes/${scene.id}/attachments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'image',
            url,
            filename: file.name,
          }),
        }
      );

      if (response.ok) {
        const attachment = await response.json();
        setAttachments((prev) => [...prev, attachment]);
        toast.success('Image uploaded');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save attachment');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle attachment deletion
  const handleDeleteAttachment = async (attachment: SceneAttachment) => {
    try {
      // Delete from database
      const response = await fetch(
        `/api/screenplays/${screenplayId}/attachments/${attachment.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        // Delete from storage
        await deleteImage(attachment.url, 'scene-images');
        setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
        toast.success('Image removed');
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to remove image');
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!scene) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[450px] p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Scene {scene.number} Workspace
          </SheetTitle>
          <SheetDescription className="truncate">
            {scene.heading}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Color Palette */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Scene Color</Label>
                  {saving && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sceneColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => handleColorSelect(color.value)}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center',
                        meta?.color === color.value
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:border-muted-foreground/50',
                        !color.value && 'bg-muted'
                      )}
                      style={color.value ? { backgroundColor: color.value } : undefined}
                      title={color.name}
                    >
                      {meta?.color === color.value && (
                        <Check
                          className={cn(
                            'h-4 w-4',
                            color.value ? 'text-white' : 'text-foreground'
                          )}
                        />
                      )}
                      {!color.value && !meta?.color && (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Mood / Tone</Label>
                <div className="flex flex-wrap gap-2">
                  {MOOD_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      size="sm"
                      variant={mood === preset ? 'default' : 'outline'}
                      onClick={() => handleMoodChange(mood === preset ? '' : preset)}
                      className="h-7 text-xs"
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
                <Input
                  placeholder="Custom mood..."
                  value={mood}
                  onChange={(e) => handleMoodChange(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Scene Notes</Label>
                </div>
                <Textarea
                  placeholder="Add notes for this scene... (e.g., shot ideas, references, pacing notes)"
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="min-h-[120px] text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Notes auto-save and won&apos;t appear in exports
                </p>
              </div>

              {/* Reference Images */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Reference Images</Label>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {attachments.length}/10
                  </span>
                </div>

                {/* Image Grid */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="relative group rounded-lg overflow-hidden border bg-muted aspect-video"
                      >
                        <img
                          src={getOptimizedImageUrl(attachment.url, { width: 300 })}
                          alt={attachment.caption || 'Scene reference'}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleDeleteAttachment(attachment)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        {attachment.caption && (
                          <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/50 text-white text-xs truncate">
                            {attachment.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || attachments.length >= 10}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Add Reference Image
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, GIF, WebP up to 5MB. Images won&apos;t appear in exports.
                </p>
              </div>

              {/* Scene Info (read-only) */}
              <div className="space-y-2 pt-4 border-t">
                <Label className="text-sm font-medium text-muted-foreground">
                  Scene Info
                </Label>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span>{scene.location.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span>{scene.timeOfDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Characters</span>
                    <span>{scene.characters.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Elements</span>
                    <span>{scene.elements.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
