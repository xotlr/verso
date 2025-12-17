'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GenrePillSelect } from './genre-pill-select';
import { SeasonPlanner, type PlannedSeason } from './season-planner';

interface CreateSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormState {
  title: string;
  logline: string;
  genres: string[];
  plannedSeasons: PlannedSeason[];
}

const defaultFormState: FormState = {
  title: '',
  logline: '',
  genres: [],
  plannedSeasons: [{ seasonNumber: 1, episodeCount: 10 }],
};

export function CreateSeriesDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSeriesDialogProps) {
  const [formData, setFormData] = useState<FormState>(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData(defaultFormState);
      onOpenChange(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          logline: formData.logline.trim() || undefined,
          genre: formData.genres.length > 0 ? formData.genres.join(', ') : undefined,
          plannedSeasons: formData.plannedSeasons,
        }),
      });

      if (res.ok) {
        setFormData(defaultFormState);
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Failed to create series:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Series</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="series-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="series-title"
                placeholder="Enter series name"
                value={formData.title}
                onChange={e => updateField('title', e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="series-logline">Logline</Label>
              <Textarea
                id="series-logline"
                placeholder="One-line summary of your series (optional)"
                value={formData.logline}
                onChange={e => updateField('logline', e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Genre Section */}
          <div className="space-y-2">
            <Label>Genre</Label>
            <GenrePillSelect
              selected={formData.genres}
              onChange={genres => updateField('genres', genres)}
              maxSelection={3}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Season Structure Section */}
          <div className="space-y-2">
            <Label>Season Structure</Label>
            <SeasonPlanner
              seasons={formData.plannedSeasons}
              onChange={seasons => updateField('plannedSeasons', seasons)}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!formData.title.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Series'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
