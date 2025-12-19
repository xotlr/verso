'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  screenplayTypes,
  ScreenplayTypeId,
  ScreenplayFormData,
  genreOptions,
  Template,
} from '@/types/templates';
import { useCreateScreenplay } from '@/hooks/use-create-screenplay';
import { Film, Tv, FileText, Check, Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import useSWR from 'swr';

// Series type for API response
interface Series {
  id: string;
  title: string;
  genre?: string | null;
  format?: string | null;
}

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (template: Template) => void; // Legacy support
  projectId?: string;
}

// Simplified type order: Film, TV Series, Blank
const typeOrder: ScreenplayTypeId[] = ['film', 'tv-series', 'blank'];

const iconComponents = {
  Film,
  Tv,
  FileText,
};

// Type-specific icon colors (minimal - only icons get color)
const typeIconColors: Record<ScreenplayTypeId, string> = {
  'film': 'text-amber-500',
  'tv-series': 'text-blue-500',
  'blank': 'text-muted-foreground',
};

export function TemplateSelector({ isOpen, onClose, onSelect: _onSelect, projectId }: TemplateSelectorProps) {
  const [selectedType, setSelectedType] = useState<ScreenplayTypeId | null>(null);
  const [formData, setFormData] = useState<ScreenplayFormData>({
    type: 'film',
    title: '',
    logline: '',
    genre: '',
    seriesTitle: '',
    season: 1,
    episode: 1,
    episodeTitle: '',
    tvFormat: 'drama',
  });

  // Series-specific state
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [isCreatingNewSeries, setIsCreatingNewSeries] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState('');
  const [newSeriesGenre, setNewSeriesGenre] = useState('');

  const { createScreenplay, isCreating } = useCreateScreenplay();
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch user's series
  const { data: seriesList, mutate: mutateSeries } = useSWR<Series[]>(
    isOpen && selectedType === 'tv-series' ? '/api/series' : null,
    fetcher
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
      setFormData({
        type: 'film',
        title: '',
        logline: '',
        genre: '',
        seriesTitle: '',
        season: 1,
        episode: 1,
        episodeTitle: '',
        tvFormat: 'drama',
      });
      setSelectedSeriesId(null);
      setIsCreatingNewSeries(false);
      setNewSeriesTitle('');
      setNewSeriesGenre('');
    }
  }, [isOpen]);

  // Auto-focus first input when type is selected
  useEffect(() => {
    if (selectedType && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [selectedType]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input, textarea, or select
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('[role="listbox"]') ||
        target.closest('[role="combobox"]')
      ) {
        return;
      }

      // Number keys 1-3 for type selection
      if (e.key === '1') {
        handleTypeSelect('film');
      } else if (e.key === '2') {
        handleTypeSelect('tv-series');
      } else if (e.key === '3') {
        handleTypeSelect('blank');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleTypeSelect = (type: ScreenplayTypeId) => {
    setSelectedType(type);
    setFormData(prev => ({ ...prev, type }));
  };

  const handleClose = () => {
    onClose();
  };

  const handleCreate = async () => {
    try {
      if (selectedType === 'tv-series') {
        let seriesId = selectedSeriesId;

        // If creating a new series (explicitly or no series exist), create it first
        const shouldCreateNewSeries = isCreatingNewSeries || (!seriesList || seriesList.length === 0);
        if (shouldCreateNewSeries && newSeriesTitle.trim()) {
          const seriesRes = await fetch('/api/series', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: newSeriesTitle.trim(),
              genre: newSeriesGenre || undefined,
            }),
          });

          if (!seriesRes.ok) {
            throw new Error('Failed to create series');
          }

          const newSeries = await seriesRes.json();
          seriesId = newSeries.id;
          mutateSeries(); // Refresh series list
        }

        // Create episode in the series
        if (seriesId) {
          const episodeRes = await fetch(`/api/series/${seriesId}/episodes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              season: formData.season || 1,
              episode: formData.episode || 1,
              episodeTitle: formData.episodeTitle?.trim() || 'Untitled Episode',
            }),
          });

          if (!episodeRes.ok) {
            const error = await episodeRes.json();
            throw new Error(error.error || 'Failed to create episode');
          }
        }

        handleClose();
      } else {
        // Film or Blank - use existing flow
        await createScreenplay({ formData, projectId });
        handleClose();
      }
    } catch (error) {
      console.error('Failed to create:', error);
    }
  };

  const canCreate = useCallback(() => {
    if (!selectedType) return false;

    switch (selectedType) {
      case 'film':
      case 'blank':
        return formData.title.trim().length > 0;
      case 'tv-series':
        // Must have either selected series OR new series title (including when no series exist)
        const shouldCreateNew = isCreatingNewSeries || (!seriesList || seriesList.length === 0);
        const hasSeriesSelection = selectedSeriesId || (shouldCreateNew && newSeriesTitle.trim().length > 0);
        const hasEpisodeInfo = (formData.episodeTitle?.trim().length ?? 0) > 0 &&
          !!formData.season &&
          !!formData.episode;
        return hasSeriesSelection && hasEpisodeInfo;
      default:
        return false;
    }
  }, [selectedType, formData, selectedSeriesId, isCreatingNewSeries, newSeriesTitle, seriesList]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold">Create New Screenplay</DialogTitle>
          <DialogDescription>
            {selectedType
              ? `Set up your ${screenplayTypes[selectedType].name.toLowerCase()}`
              : 'Choose a type to get started'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Type Selection Cards */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-3 gap-3">
            {typeOrder.map((typeId, index) => {
              const typeConfig = screenplayTypes[typeId];
              const IconComponent = iconComponents[typeConfig.iconName];
              const isSelected = selectedType === typeId;
              const iconColor = typeIconColors[typeId];

              return (
                <motion.button
                  key={typeId}
                  onClick={() => handleTypeSelect(typeId)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'group relative p-5 rounded-xl border transition-all duration-200 text-left',
                    'min-h-[130px] flex flex-col',
                    'hover:-translate-y-0.5 active:scale-[0.98]',
                    isSelected
                      ? 'border-primary bg-accent/50 shadow-sm'
                      : 'border-border/60 hover:border-border hover:bg-accent/30'
                  )}
                >
                  {/* Icon - colored accent */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-all duration-200',
                      'bg-muted/50'
                    )}
                  >
                    <IconComponent
                      className={cn(
                        'h-6 w-6 transition-all duration-200',
                        iconColor,
                        'group-hover:scale-105'
                      )}
                    />
                  </div>

                  {/* Text */}
                  <h3 className="font-medium text-sm mb-1">
                    {typeConfig.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 flex-grow">
                    {typeConfig.description}
                  </p>

                  {/* Check indicator */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        className="absolute top-2.5 right-2.5"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Form Fields - Progressive Disclosure */}
        <AnimatePresence mode="wait">
          {selectedType && (
            <motion.div
              key={selectedType}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-4 border-t border-border/40 pt-4">
                <DetailsForm
                  type={selectedType}
                  formData={formData}
                  setFormData={setFormData}
                  firstInputRef={firstInputRef}
                  seriesList={seriesList}
                  selectedSeriesId={selectedSeriesId}
                  setSelectedSeriesId={setSelectedSeriesId}
                  isCreatingNewSeries={isCreatingNewSeries}
                  setIsCreatingNewSeries={setIsCreatingNewSeries}
                  newSeriesTitle={newSeriesTitle}
                  setNewSeriesTitle={setNewSeriesTitle}
                  newSeriesGenre={newSeriesGenre}
                  setNewSeriesGenre={setNewSeriesGenre}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-muted/30">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!canCreate() || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Screenplay'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Form Fields Component
interface DetailsFormProps {
  type: ScreenplayTypeId;
  formData: ScreenplayFormData;
  setFormData: React.Dispatch<React.SetStateAction<ScreenplayFormData>>;
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

function DetailsForm({
  type,
  formData,
  setFormData,
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
  const updateField = <K extends keyof ScreenplayFormData>(
    key: K,
    value: ScreenplayFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

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
                  <Select
                    value={newSeriesGenre}
                    onValueChange={setNewSeriesGenre}
                  >
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
