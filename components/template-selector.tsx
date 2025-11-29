'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  screenplayTypes,
  ScreenplayTypeId,
  ScreenplayFormData,
  genreOptions,
  tvFormatOptions,
  TVFormat,
  Template,
} from '@/types/templates';
import { useCreateScreenplay } from '@/hooks/useCreateScreenplay';
import { Film, Tv, Theater, FileText, Sparkles, Check, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (template: Template) => void; // Legacy support
  projectId?: string;
}

const typeOrder: ScreenplayTypeId[] = ['feature', 'tv-series', 'short', 'stage', 'blank'];

const iconComponents = {
  Film,
  Tv,
  Sparkles,
  Theater,
  FileText,
};

// Animation variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 30 : -30,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 30 : -30,
    opacity: 0,
  }),
};

export function TemplateSelector({ isOpen, onClose, onSelect, projectId }: TemplateSelectorProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [selectedType, setSelectedType] = useState<ScreenplayTypeId | null>(null);
  const [formData, setFormData] = useState<ScreenplayFormData>({
    type: 'feature',
    title: '',
    logline: '',
    genre: '',
    seriesTitle: '',
    season: 1,
    episode: 1,
    episodeTitle: '',
    tvFormat: 'drama',
    targetRuntime: undefined,
  });

  const { createScreenplay, isCreating } = useCreateScreenplay();

  const handleTypeSelect = (type: ScreenplayTypeId) => {
    setSelectedType(type);
    setFormData(prev => ({ ...prev, type }));
  };

  const handleNext = () => {
    if (selectedType) {
      setDirection(1);
      setStep(2);
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(1);
  };

  const handleClose = () => {
    // Reset state on close
    setStep(1);
    setDirection(0);
    setSelectedType(null);
    setFormData({
      type: 'feature',
      title: '',
      logline: '',
      genre: '',
      seriesTitle: '',
      season: 1,
      episode: 1,
      episodeTitle: '',
      tvFormat: 'drama',
      targetRuntime: undefined,
    });
    onClose();
  };

  const handleCreate = async () => {
    try {
      await createScreenplay({ formData, projectId });
      handleClose();
    } catch (error) {
      console.error('Failed to create screenplay:', error);
    }
  };

  const canProceedToStep2 = selectedType !== null;

  const canCreate = useCallback(() => {
    if (!selectedType) return false;

    switch (selectedType) {
      case 'feature':
      case 'short':
      case 'stage':
        return formData.title.trim().length > 0;
      case 'tv-series':
        return (
          (formData.seriesTitle?.trim().length ?? 0) > 0 &&
          (formData.episodeTitle?.trim().length ?? 0) > 0 &&
          !!formData.season &&
          !!formData.episode
        );
      case 'blank':
        return formData.title.trim().length > 0;
      default:
        return false;
    }
  }, [selectedType, formData]);

  const getStepDescription = () => {
    if (step === 1) return 'What type of screenplay are you writing?';
    const typeName = selectedType ? screenplayTypes[selectedType].name : '';
    return `Set up your ${typeName}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl">Create New Screenplay</DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="px-6 pb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step} of 2</span>
            <span>{step === 1 ? 'Choose Type' : 'Enter Details'}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-600"
              initial={{ width: '50%' }}
              animate={{ width: `${(step / 2) * 100}%` }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 pb-4 min-h-[320px]">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <TypeSelectionStep
                  selectedType={selectedType}
                  onSelect={handleTypeSelect}
                />
              </motion.div>
            )}
            {step === 2 && selectedType && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <DetailsStep
                  type={selectedType}
                  formData={formData}
                  setFormData={setFormData}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-muted/30">
          <Button
            variant="ghost"
            onClick={step > 1 ? handleBack : handleClose}
            disabled={isCreating}
          >
            {step > 1 ? (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </>
            ) : (
              'Cancel'
            )}
          </Button>
          <Button
            onClick={step === 2 ? handleCreate : handleNext}
            disabled={(step === 1 && !canProceedToStep2) || (step === 2 && !canCreate()) || isCreating}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : step === 2 ? (
              'Create Screenplay'
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step 1: Type Selection
interface TypeSelectionStepProps {
  selectedType: ScreenplayTypeId | null;
  onSelect: (type: ScreenplayTypeId) => void;
}

function TypeSelectionStep({ selectedType, onSelect }: TypeSelectionStepProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {typeOrder.map((typeId) => {
        const typeConfig = screenplayTypes[typeId];
        const IconComponent = iconComponents[typeConfig.iconName];
        const isSelected = selectedType === typeId;

        return (
          <button
            key={typeId}
            onClick={() => onSelect(typeId)}
            className={cn(
              'group relative p-4 rounded-xl border-2 transition-all duration-200 text-left',
              'hover:shadow-md active:scale-[0.98]',
              isSelected
                ? 'border-primary shadow-lg'
                : 'border-border hover:border-primary/50'
            )}
          >
            {/* Gradient background when selected */}
            <div
              className={cn(
                'absolute inset-0 rounded-xl transition-opacity duration-200',
                isSelected ? 'opacity-100' : 'opacity-0'
              )}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, var(--${typeConfig.color}-100, hsl(var(--primary) / 0.1)) 0%, var(--${typeConfig.color}-50, hsl(var(--primary) / 0.05)) 100%)`
                  : undefined,
              }}
            />

            {/* Content */}
            <div className="relative">
              {/* Icon */}
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors',
                  `bg-gradient-to-br ${typeConfig.gradient}`,
                  isSelected && 'bg-gradient-to-br from-primary/20 to-primary/10'
                )}
              >
                <IconComponent
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
              </div>

              {/* Text */}
              <h3 className="font-semibold text-sm mb-1">{typeConfig.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {typeConfig.description}
              </p>

              {/* Check indicator */}
              {isSelected && (
                <div className="absolute top-0 right-0">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Step 2: Details Form
interface DetailsStepProps {
  type: ScreenplayTypeId;
  formData: ScreenplayFormData;
  setFormData: React.Dispatch<React.SetStateAction<ScreenplayFormData>>;
}

function DetailsStep({ type, formData, setFormData }: DetailsStepProps) {
  const updateField = <K extends keyof ScreenplayFormData>(
    key: K,
    value: ScreenplayFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  switch (type) {
    case 'feature':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter your screenplay title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logline">Logline</Label>
            <Textarea
              id="logline"
              placeholder="A brief one or two sentence summary of your story"
              value={formData.logline || ''}
              onChange={(e) => updateField('logline', e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="genre">Genre</Label>
            <Select
              value={formData.genre || ''}
              onValueChange={(value) => updateField('genre', value)}
            >
              <SelectTrigger id="genre">
                <SelectValue placeholder="Select a genre" />
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
        </div>
      );

    case 'tv-series':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seriesTitle">Series Title *</Label>
            <Input
              id="seriesTitle"
              placeholder="Enter the series name"
              value={formData.seriesTitle || ''}
              onChange={(e) => updateField('seriesTitle', e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="season">Season *</Label>
              <Input
                id="season"
                type="number"
                min={1}
                placeholder="1"
                value={formData.season || ''}
                onChange={(e) => updateField('season', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="episode">Episode *</Label>
              <Input
                id="episode"
                type="number"
                min={1}
                placeholder="1"
                value={formData.episode || ''}
                onChange={(e) => updateField('episode', parseInt(e.target.value) || 1)}
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
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="grid grid-cols-3 gap-2">
              {tvFormatOptions.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => updateField('tvFormat', format.id)}
                  className={cn(
                    'p-3 rounded-lg border-2 text-center transition-all',
                    formData.tvFormat === format.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="font-medium text-sm">{format.label}</div>
                  <div className="text-xs text-muted-foreground">{format.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );

    case 'short':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter your short film title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logline">Logline</Label>
            <Textarea
              id="logline"
              placeholder="A brief summary of your short film"
              value={formData.logline || ''}
              onChange={(e) => updateField('logline', e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="runtime">Target Runtime (minutes)</Label>
            <Input
              id="runtime"
              type="number"
              min={1}
              max={40}
              placeholder="15"
              value={formData.targetRuntime || ''}
              onChange={(e) => updateField('targetRuntime', parseInt(e.target.value) || undefined)}
            />
            <p className="text-xs text-muted-foreground">
              Short films are typically 5-30 minutes
            </p>
          </div>
        </div>
      );

    case 'stage':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter your play title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logline">Logline</Label>
            <Textarea
              id="logline"
              placeholder="A brief summary of your play"
              value={formData.logline || ''}
              onChange={(e) => updateField('logline', e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      );

    case 'blank':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter a title for your screenplay"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              autoFocus
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Start with a blank canvas. You can set up additional details later.
          </p>
        </div>
      );

    default:
      return null;
  }
}
