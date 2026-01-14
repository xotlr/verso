import { useState, useCallback } from 'react';
import type { TitlePageFields } from '@/lib/validation';

/**
 * Screenplay type (format displayed in UI).
 */
export type ScreenplayType = 'FEATURE' | 'TV' | 'SHORT';

/**
 * Screenplay metadata state.
 */
export interface ScreenplayMetadataState {
  screenplayType: ScreenplayType;
  season: number | null;
  episode: number | null;
  episodeTitle: string | null;
  logline: string | null;
  genre: string | null;
  author: string | null;
  titlePageFields: TitlePageFields;
}

/**
 * API response screenplay shape (partial, just the metadata fields).
 */
interface ScreenplayResponse {
  type?: string | null;
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
  logline?: string | null;
  genre?: string | null;
  author?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
  copyrightYear?: number | null;
  copyrightHolder?: string | null;
  registrationNumber?: string | null;
  draftLabel?: string | null;
  draftDate?: string | null;
  showTitlePageContact?: boolean | null;
  showTitlePageCopyright?: boolean | null;
  showTitlePageDraft?: boolean | null;
}

const DEFAULT_METADATA: ScreenplayMetadataState = {
  screenplayType: 'FEATURE',
  season: null,
  episode: null,
  episodeTitle: null,
  logline: null,
  genre: null,
  author: null,
  titlePageFields: {},
};

/**
 * Hook to manage screenplay metadata state.
 * Extracts metadata fields from ScreenplayEditorWrapper into a focused hook.
 */
export function useScreenplayMetadata() {
  const [state, setState] = useState<ScreenplayMetadataState>(DEFAULT_METADATA);

  /**
   * Set metadata from a screenplay API response.
   */
  const setFromScreenplay = useCallback((screenplay: ScreenplayResponse) => {
    // Map API type to ScreenplayType
    let screenplayType: ScreenplayType = 'FEATURE';
    if (screenplay.type === 'TV') {
      screenplayType = 'TV';
    } else if (screenplay.type === 'FILM' || screenplay.type === 'FEATURE') {
      screenplayType = 'FEATURE';
    } else if (screenplay.type === 'SHORT') {
      screenplayType = 'SHORT';
    }

    // Extract title page fields
    const titlePageFields: TitlePageFields = {
      contactName: screenplay.contactName,
      contactEmail: screenplay.contactEmail,
      contactPhone: screenplay.contactPhone,
      contactAddress: screenplay.contactAddress,
      copyrightYear: screenplay.copyrightYear,
      copyrightHolder: screenplay.copyrightHolder,
      registrationNumber: screenplay.registrationNumber,
      draftLabel: screenplay.draftLabel,
      draftDate: screenplay.draftDate
        ? new Date(screenplay.draftDate).toISOString().split('T')[0]
        : null,
      showTitlePageContact: screenplay.showTitlePageContact ?? true,
      showTitlePageCopyright: screenplay.showTitlePageCopyright ?? true,
      showTitlePageDraft: screenplay.showTitlePageDraft ?? true,
    };

    setState({
      screenplayType,
      season: screenplay.season ?? null,
      episode: screenplay.episode ?? null,
      episodeTitle: screenplay.episodeTitle ?? null,
      logline: screenplay.logline ?? null,
      genre: screenplay.genre ?? null,
      author: screenplay.author ?? null,
      titlePageFields,
    });
  }, []);

  /**
   * Reset metadata to defaults.
   */
  const reset = useCallback(() => {
    setState(DEFAULT_METADATA);
  }, []);

  /**
   * Update individual metadata fields.
   */
  const setScreenplayType = useCallback((type: ScreenplayType) => {
    setState((prev) => ({ ...prev, screenplayType: type }));
  }, []);

  const setSeason = useCallback((season: number | null) => {
    setState((prev) => ({ ...prev, season }));
  }, []);

  const setEpisode = useCallback((episode: number | null) => {
    setState((prev) => ({ ...prev, episode }));
  }, []);

  const setEpisodeTitle = useCallback((episodeTitle: string | null) => {
    setState((prev) => ({ ...prev, episodeTitle }));
  }, []);

  const setLogline = useCallback((logline: string | null) => {
    setState((prev) => ({ ...prev, logline }));
  }, []);

  const setGenre = useCallback((genre: string | null) => {
    setState((prev) => ({ ...prev, genre }));
  }, []);

  const setAuthor = useCallback((author: string | null) => {
    setState((prev) => ({ ...prev, author }));
  }, []);

  const setTitlePageFields = useCallback((fields: TitlePageFields) => {
    setState((prev) => ({ ...prev, titlePageFields: fields }));
  }, []);

  return {
    // State values (spread for convenience)
    ...state,

    // Batch setter
    setFromScreenplay,
    reset,

    // Individual setters
    setScreenplayType,
    setSeason,
    setEpisode,
    setEpisodeTitle,
    setLogline,
    setGenre,
    setAuthor,
    setTitlePageFields,
  };
}

export type UseScreenplayMetadata = ReturnType<typeof useScreenplayMetadata>;
