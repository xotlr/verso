'use client';

import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { ScreenplayTypeId, ScreenplayFormData, genreOptions } from '@/types/templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Series {
  id: string;
  title: string;
  genre?: string | null;
  format?: string | null;
}

interface DetailsFormProps {
  type: ScreenplayTypeId;
  formData: ScreenplayFormData;
  updateField: <K extends keyof ScreenplayFormData>(
    key: K,
    value: ScreenplayFormData[K]
  ) => void;
  firstInputRef: React.RefObject<HTMLInputElement | null>;
  // Series-specific props
  seriesList?: Series[];
  selectedSeriesId: string | null;
  setSelectedSeriesId: (id: string | null) => void;
  isCreatingNewSeries: boolean;
  setIsCreatingNewSeries: (val: boolean) => void;
  newSeriesTitle: string;
  setNewSeriesTitle: (val: string) => void;
  newSeriesGenre: string;
  setNewSeriesGenre: (val: string) => void;
}

export function DetailsForm({
  type,
  formData,
  updateField,
  firstInputRef,
  seriesList,
  selectedSeriesId,
  setSelectedSeriesId,
  isCreatingNewSeries,
  setIsCreatingNewSeries,
  newSeriesTitle,
  setNewSeriesTitle,
  newSeriesGenre,
  setNewSeriesGenre,
}: DetailsFormProps) {
  switch (type) {
    case 'film':
      return (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              ref={firstInputRef}
              id="title"
              placeholder="Enter your screenplay title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Select
                value={formData.genre || ''}
                onValueChange={(value) => updateField('genre', value)}
              >
                <SelectTrigger id="genre">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {genreOptions.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logline">Logline</Label>
              <Input
                id="logline"
                placeholder="One-line summary"
                value={formData.logline || ''}
                onChange={(e) => updateField('logline', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Written By</Label>
            <Input
              id="author"
              placeholder="Your name (leave blank to use account name)"
              value={formData.author || ''}
              onChange={(e) => updateField('author', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Add co-writers separated by &amp; or &quot;and&quot;
            </p>
          </div>
        </motion.div>
      );

    case 'tv-series':
      return (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Series Selection */}
          <div className="space-y-2">
            <Label>Series *</Label>
            {seriesList && seriesList.length > 0 && !isCreatingNewSeries ? (
              <div className="space-y-2">
                <Select
                  value={selectedSeriesId || ''}
                  onValueChange={(value) => {
                    setSelectedSeriesId(value);
                    setIsCreatingNewSeries(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a series" />
                  </SelectTrigger>
                  <SelectContent>
                    {seriesList.map((series) => (
                      <SelectItem key={series.id} value={series.id}>
                        {series.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    setSelectedSeriesId(null);
                    setIsCreatingNewSeries(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create new series
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  ref={firstInputRef}
                  id="newSeriesTitle"
                  placeholder="Enter new series name"
                  value={newSeriesTitle}
                  onChange={(e) => setNewSeriesTitle(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Select value={newSeriesGenre} onValueChange={setNewSeriesGenre}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Genre (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {genreOptions.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {seriesList && seriesList.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => {
                        setIsCreatingNewSeries(false);
                        setNewSeriesTitle('');
                        setNewSeriesGenre('');
                      }}
                    >
                      Select existing
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Episode Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="season">Season *</Label>
              <NumberInput
                id="season"
                value={formData.season || 1}
                onChange={(value) => {
                  updateField('season', value);
                  updateField('episode', 1);
                }}
                min={1}
                max={99}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="episode">Episode *</Label>
              <NumberInput
                id="episode"
                value={formData.episode || 1}
                onChange={(value) => updateField('episode', value)}
                min={1}
                max={999}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="episodeTitle">Episode Title *</Label>
            <Input
              id="episodeTitle"
              placeholder="Enter the episode title"
              value={formData.episodeTitle || ''}
              onChange={(e) => updateField('episodeTitle', e.target.value)}
            />
          </div>
        </motion.div>
      );

    case 'blank':
      return (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              ref={firstInputRef}
              id="title"
              placeholder="Enter a title for your screenplay"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Start with a blank canvas. You can set up additional details later.
          </p>
        </motion.div>
      );

    default:
      return null;
  }
}
