'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GenrePillSelect } from './genre-pill-select';
import { ImageUpload } from '@/components/image-upload';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series: {
    id: string;
    title: string;
    logline: string | null;
    genre: string | null;
    format: string | null;
    banner: string | null;
  };
  userId: string;
  onSave: (updates: {
    title?: string;
    logline?: string;
    genre?: string;
    format?: string;
    banner?: string | null;
  }) => Promise<void>;
}

const formatOptions = [
  { value: 'one-hour', label: 'One-Hour Drama' },
  { value: 'half-hour', label: 'Half-Hour' },
  { value: 'multi-cam', label: 'Multi-Cam Sitcom' },
  { value: 'limited', label: 'Limited Series' },
  { value: 'anthology', label: 'Anthology' },
];

export function EditSeriesDialog({
  open,
  onOpenChange,
  series,
  userId,
  onSave,
}: EditSeriesDialogProps) {
  const initialGenres = series.genre
    ? series.genre.split(',').map(g => g.trim()).filter(Boolean)
    : [];

  const [title, setTitle] = useState(series.title);
  const [logline, setLogline] = useState(series.logline || '');
  const [genres, setGenres] = useState<string[]>(initialGenres);
  const [format, setFormat] = useState(series.format || '');
  const [banner, setBanner] = useState<string | undefined>(series.banner || undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens with new series data
  useEffect(() => {
    if (open) {
      setTitle(series.title);
      setLogline(series.logline || '');
      setGenres(series.genre ? series.genre.split(',').map(g => g.trim()).filter(Boolean) : []);
      setFormat(series.format || '');
      setBanner(series.banner || undefined);
    }
  }, [open, series]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        logline: logline.trim() || undefined,
        genre: genres.length > 0 ? genres.join(', ') : undefined,
        format: format || undefined,
        banner: banner || null,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Edit Series</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-6 space-y-6">
            {/* Banner Upload */}
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <ImageUpload
                value={banner}
                onChange={setBanner}
                bucket="banners"
                userId={userId}
                aspectRatio="banner"
                placeholder="Drop a banner image or click to upload"
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Series title"
              />
            </div>

            {/* Logline */}
            <div className="space-y-2">
              <Label htmlFor="logline">Logline</Label>
              <Textarea
                id="logline"
                placeholder="A one-line summary of your series..."
                value={logline}
                onChange={e => setLogline(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                A compelling summary that captures the essence of your series.
              </p>
            </div>

            {/* Genre */}
            <div className="space-y-2">
              <Label>Genre</Label>
              <GenrePillSelect
                selected={genres}
                onChange={setGenres}
                maxSelection={3}
              />
            </div>

            {/* Format */}
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
