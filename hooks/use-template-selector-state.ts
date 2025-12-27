'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ScreenplayTypeId, ScreenplayFormData } from '@/types/templates';
import { useCreateScreenplay } from '@/hooks/use-create-screenplay';
import useSWR from 'swr';

interface Series {
  id: string;
  title: string;
  genre?: string | null;
  format?: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const initialFormData: ScreenplayFormData = {
  type: 'film',
  title: '',
  logline: '',
  genre: '',
  seriesTitle: '',
  season: 1,
  episode: 1,
  episodeTitle: '',
  tvFormat: 'drama',
};

interface UseTemplateSelectorStateOptions {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export interface UseTemplateSelectorStateReturn {
  // Type selection
  selectedType: ScreenplayTypeId | null;
  handleTypeSelect: (type: ScreenplayTypeId) => void;

  // Form data
  formData: ScreenplayFormData;
  setFormData: React.Dispatch<React.SetStateAction<ScreenplayFormData>>;
  updateField: <K extends keyof ScreenplayFormData>(
    key: K,
    value: ScreenplayFormData[K]
  ) => void;

  // Series management
  seriesList: Series[] | undefined;
  selectedSeriesId: string | null;
  setSelectedSeriesId: (id: string | null) => void;
  isCreatingNewSeries: boolean;
  setIsCreatingNewSeries: (val: boolean) => void;
  newSeriesTitle: string;
  setNewSeriesTitle: (val: string) => void;
  newSeriesGenre: string;
  setNewSeriesGenre: (val: string) => void;
  mutateSeries: () => void;

  // Validation and submission
  canCreate: () => boolean;
  handleCreate: () => Promise<void>;
  handleClose: () => void;
  isCreating: boolean;

  // Refs
  firstInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useTemplateSelectorState({
  isOpen,
  onClose,
  projectId,
}: UseTemplateSelectorStateOptions): UseTemplateSelectorStateReturn {
  const [selectedType, setSelectedType] = useState<ScreenplayTypeId | null>(null);
  const [formData, setFormData] = useState<ScreenplayFormData>(initialFormData);

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

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
      setFormData(initialFormData);
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

  const handleTypeSelect = useCallback((type: ScreenplayTypeId) => {
    setSelectedType(type);
    setFormData((prev) => ({ ...prev, type }));
  }, []);

  const updateField = useCallback(
    <K extends keyof ScreenplayFormData>(key: K, value: ScreenplayFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCreate = useCallback(async () => {
    try {
      if (selectedType === 'tv-series') {
        let seriesId = selectedSeriesId;

        const shouldCreateNewSeries =
          isCreatingNewSeries || !seriesList || seriesList.length === 0;
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
          mutateSeries();
        }

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
        await createScreenplay({ formData, projectId });
        handleClose();
      }
    } catch (error) {
      console.error('Failed to create:', error);
    }
  }, [
    selectedType,
    selectedSeriesId,
    isCreatingNewSeries,
    seriesList,
    newSeriesTitle,
    newSeriesGenre,
    formData,
    projectId,
    createScreenplay,
    handleClose,
    mutateSeries,
  ]);

  const canCreate = useCallback(() => {
    if (!selectedType) return false;

    switch (selectedType) {
      case 'film':
      case 'blank':
        return formData.title.trim().length > 0;
      case 'tv-series':
        const shouldCreateNew =
          isCreatingNewSeries || !seriesList || seriesList.length === 0;
        const hasSeriesSelection =
          !!selectedSeriesId || (shouldCreateNew && newSeriesTitle.trim().length > 0);
        const hasEpisodeInfo =
          (formData.episodeTitle?.trim().length ?? 0) > 0 &&
          !!formData.season &&
          !!formData.episode;
        return !!(hasSeriesSelection && hasEpisodeInfo);
      default:
        return false;
    }
  }, [
    selectedType,
    formData,
    selectedSeriesId,
    isCreatingNewSeries,
    newSeriesTitle,
    seriesList,
  ]);

  return {
    selectedType,
    handleTypeSelect,
    formData,
    setFormData,
    updateField,
    seriesList,
    selectedSeriesId,
    setSelectedSeriesId,
    isCreatingNewSeries,
    setIsCreatingNewSeries,
    newSeriesTitle,
    setNewSeriesTitle,
    newSeriesGenre,
    setNewSeriesGenre,
    mutateSeries,
    canCreate,
    handleCreate,
    handleClose,
    isCreating,
    firstInputRef,
  };
}
