'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GenrePillSelect } from './genre-pill-select';
import { Loader2, Save } from 'lucide-react';

interface SeriesOverviewTabProps {
  series: {
    id: string;
    title: string;
    logline: string | null;
    genre: string | null;
    format: string | null;
  };
  onSave: (updates: {
    logline?: string;
    genre?: string;
    format?: string;
  }) => Promise<void>;
}

const formatOptions = [
  { value: 'one-hour', label: 'One-Hour Drama' },
  { value: 'half-hour', label: 'Half-Hour' },
  { value: 'multi-cam', label: 'Multi-Cam Sitcom' },
  { value: 'limited', label: 'Limited Series' },
  { value: 'anthology', label: 'Anthology' },
];

export function SeriesOverviewTab({ series, onSave }: SeriesOverviewTabProps) {
  // Parse genres from comma-separated string
  const initialGenres = series.genre
    ? series.genre.split(',').map(g => g.trim()).filter(Boolean)
    : [];

  const [logline, setLogline] = useState(series.logline || '');
  const [genres, setGenres] = useState<string[]>(initialGenres);
  const [format, setFormat] = useState(series.format || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = () => {
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        logline: logline || undefined,
        genre: genres.length > 0 ? genres.join(', ') : undefined,
        format: format || undefined,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Logline */}
      <div className="space-y-3">
        <Label htmlFor="logline" className="text-base font-semibold">
          Logline
        </Label>
        <Textarea
          id="logline"
          placeholder="A one-line summary of your series..."
          value={logline}
          onChange={e => {
            setLogline(e.target.value);
            handleChange();
          }}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          A compelling one or two sentence summary that captures the essence of your series.
        </p>
      </div>

      {/* Genre */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Genre</Label>
        <GenrePillSelect
          selected={genres}
          onChange={newGenres => {
            setGenres(newGenres);
            handleChange();
          }}
          maxSelection={3}
        />
      </div>

      {/* Format */}
      <div className="space-y-3">
        <Label htmlFor="format" className="text-base font-semibold">
          Format
        </Label>
        <Select
          value={format}
          onValueChange={value => {
            setFormat(value);
            handleChange();
          }}
        >
          <SelectTrigger className="w-full max-w-xs">
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

      {/* Show Bible / Notes */}
      <div className="space-y-3">
        <Label htmlFor="bible" className="text-base font-semibold">
          Series Bible
        </Label>
        <Textarea
          id="bible"
          placeholder="Document your series world, themes, tone, and key story elements..."
          rows={8}
          className="resize-none font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          A living document that captures the essential elements of your series: world, tone, themes, and story arcs.
        </p>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
