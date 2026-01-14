'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useOfflineSave, type SyncStatus } from '@/hooks/use-offline-save';
import { useTimelapseRecorder } from '@/hooks/timelapse';
import { parseScreenplayText } from '@/lib/screenplay/utils';
import type { Scene, Character, Location } from '@/types/screenplay';

interface UseScreenplayPersistenceOptions {
  screenplayId: string;
  onTitleChange?: (title: string) => void;
  /** Skip initial load - use when loading externally with metadata */
  skipInitialLoad?: boolean;
}

interface UseScreenplayPersistenceReturn {
  // Content state
  screenplayText: string;
  setScreenplayText: (text: string) => void;
  screenplayTitle: string;
  setScreenplayTitle: (title: string) => void;
  screenplayTextRef: React.MutableRefObject<string>;

  // Parsed data
  scenes: Scene[];
  characters: Character[];
  locations: Location[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;

  // Status
  isSaving: boolean;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  syncStatus: SyncStatus;

  // Version management
  isSaveVersionDialogOpen: boolean;
  setIsSaveVersionDialogOpen: (open: boolean) => void;
  handleSaveVersionWithMessage: (message?: string) => Promise<void>;

  // Handlers
  handleTextChange: (text: string) => void;
  handleRestore: (content: string) => void;
  saveScreenplay: (content: string, createVersionSnapshot?: boolean) => Promise<void>;

  // Timelapse
  recordContentChange: (content: string) => void;
  initializeTimelapse: (content: string) => void;
}

/**
 * Custom hook for managing screenplay persistence.
 * Handles auto-save, version history, timelapse recording, and offline sync.
 */
export function useScreenplayPersistence({
  screenplayId,
  onTitleChange,
  skipInitialLoad = false,
}: UseScreenplayPersistenceOptions): UseScreenplayPersistenceReturn {
  const [screenplayText, setScreenplayTextState] = useState("");
  const [screenplayTitle, setScreenplayTitle] = useState("Untitled Screenplay");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaveVersionDialogOpen, setIsSaveVersionDialogOpen] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const versionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVersionContentRef = useRef<string>("");
  const screenplayTextRef = useRef(screenplayText);
  const lastNotifiedTitleRef = useRef<string>("");

  // Offline save hook
  const {
    save: offlineSave,
    syncStatus,
    isSyncing,
  } = useOfflineSave({ screenplayId });

  const isSaving = isSyncing || syncStatus === 'syncing';

  // Timelapse recording
  const {
    recordContentChange,
    initializeWithContent: initializeTimelapse,
  } = useTimelapseRecorder({
    screenplayId,
    enabled: true,
  });

  // Create a version snapshot
  const createVersion = useCallback(async (
    content: string,
    reason: "manual" | "auto" | "interval" | "restore",
    message?: string
  ) => {
    // Skip if content hasn't changed since last version
    if (content === lastVersionContentRef.current && reason !== "manual") {
      return;
    }

    try {
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      const sceneCount = (content.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/gim) || []).length;

      const response = await fetch(`/api/screenplays/${screenplayId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          reason,
          wordCount,
          sceneCount,
          message: message || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save version (${response.status})`);
      }

      lastVersionContentRef.current = content;
      if (reason === "manual") {
        toast.success("Version saved");
      }
    } catch (error) {
      // Show error only for manual saves (don't spam user with auto-save failures)
      if (reason === "manual") {
        toast.error("Failed to save version");
      }
      // Log for debugging but don't block user
      if (process.env.NODE_ENV === "development") {
        console.error("Error creating version:", error);
      }
    }
  }, [screenplayId]);

  // Save screenplay (local-first)
  const saveScreenplay = useCallback(async (content: string, createVersionSnapshot = false) => {
    try {
      await offlineSave(content, screenplayTitle);

      if (createVersionSnapshot) {
        setIsSaveVersionDialogOpen(true);
      }
    } catch (error) {
      // offlineSave handles its own errors and queues for retry
      // Only log in development to avoid console noise
      if (process.env.NODE_ENV === "development") {
        console.error("Error saving screenplay:", error);
      }
    }
  }, [offlineSave, screenplayTitle]);

  // Handle save with message from dialog
  const handleSaveVersionWithMessage = useCallback(async (message?: string) => {
    const currentContent = screenplayTextRef.current;
    await createVersion(currentContent, "manual", message);
  }, [createVersion]);

  // Wrapper for setScreenplayText that also updates the ref
  const setScreenplayText = useCallback((text: string) => {
    setScreenplayTextState(text);
    screenplayTextRef.current = text;
  }, []);

  // Wrapper for setScreenplayTitle (onTitleChange is handled via effect below)
  const handleSetScreenplayTitle = useCallback((title: string) => {
    setScreenplayTitle(title);
  }, []);

  // Notify parent when title changes (decoupled to prevent render loops)
  useEffect(() => {
    // Only notify if title actually changed from last notification
    if (
      onTitleChange &&
      screenplayTitle &&
      screenplayTitle !== "Untitled Screenplay" &&
      screenplayTitle !== lastNotifiedTitleRef.current
    ) {
      lastNotifiedTitleRef.current = screenplayTitle;
      onTitleChange(screenplayTitle);
    }
  }, [screenplayTitle, onTitleChange]);

  // Debounced auto-save handler
  const handleTextChange = useCallback((text: string) => {
    // Store in ref immediately
    screenplayTextRef.current = text;

    // Record for timelapse
    recordContentChange(text);

    // Debounce save and state updates
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      // Update state only when saving
      setScreenplayTextState(text);

      // Parse scenes/characters
      const parsed = parseScreenplayText(text);
      setScenes(parsed.scenes || []);
      setCharacters(parsed.characters || []);
      setLocations(parsed.locations || []);

      // Save to server
      saveScreenplay(text);
    }, 2000);
  }, [saveScreenplay, recordContentChange]);

  // Handle restore from version history
  const handleRestore = useCallback((content: string) => {
    setScreenplayTextState(content);
    screenplayTextRef.current = content;
    const parsed = parseScreenplayText(content);
    setScenes(parsed.scenes || []);
    setCharacters(parsed.characters || []);
    setLocations(parsed.locations || []);
    saveScreenplay(content);
  }, [saveScreenplay]);

  // Sync ref with state on initial load
  useEffect(() => {
    screenplayTextRef.current = screenplayText;
  }, [screenplayText]);

  // Interval-based versioning (every 30 minutes)
  useEffect(() => {
    versionIntervalRef.current = setInterval(() => {
      const currentText = screenplayTextRef.current;
      if (currentText && currentText !== lastVersionContentRef.current) {
        createVersion(currentText, "interval");
      }
    }, 30 * 60 * 1000);

    return () => {
      if (versionIntervalRef.current) {
        clearInterval(versionIntervalRef.current);
      }
    };
  }, [createVersion]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Listen for title save events
  useEffect(() => {
    const handleTitleSave = async (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string }>;
      const newTitle = customEvent.detail.title;

      try {
        const response = await fetch(`/api/screenplays/${screenplayId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        });

        if (response.ok) {
          setScreenplayTitle(newTitle);
          if (onTitleChange) {
            onTitleChange(newTitle);
          }
          toast.success("Title updated");
        } else {
          toast.error("Failed to update title");
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error('Failed to update title:', error);
        }
        toast.error("Failed to update title");
      }
    };

    window.addEventListener('screenplay-title-save', handleTitleSave);
    return () => window.removeEventListener('screenplay-title-save', handleTitleSave);
  }, [screenplayId, onTitleChange]);

  // Load screenplay initially (skip if external loading is used)
  useEffect(() => {
    if (skipInitialLoad) return;

    const loadScreenplay = async () => {
      try {
        const response = await fetch(`/api/screenplays/${screenplayId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to load screenplay (${response.status})`);
        }

        const screenplay = await response.json();
        const content = screenplay.content || "";
        setScreenplayTextState(content);
        screenplayTextRef.current = content;

        const title = screenplay.title || "Untitled Screenplay";
        setScreenplayTitle(title);
        if (onTitleChange) {
          onTitleChange(title);
        }

        const parsed = parseScreenplayText(content);
        setScenes(parsed.scenes || []);
        setCharacters(parsed.characters || []);
        setLocations(parsed.locations || []);

        // Initialize timelapse
        initializeTimelapse(content);

        // Dispatch breadcrumb event if series
        if (screenplay.series) {
          window.dispatchEvent(new CustomEvent('screenplay-breadcrumb-update', {
            detail: {
              series: screenplay.series,
              season: screenplay.seasonRef,
              episode: {
                episode: screenplay.episode,
                episodeTitle: screenplay.episodeTitle,
              },
            },
          }));
        }
      } catch (error) {
        toast.error("Failed to load screenplay");
        if (process.env.NODE_ENV === "development") {
          console.error("Error loading screenplay:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadScreenplay();
  }, [screenplayId, onTitleChange, initializeTimelapse, skipInitialLoad]);

  return useMemo(() => ({
    screenplayText,
    setScreenplayText,
    screenplayTitle,
    setScreenplayTitle: handleSetScreenplayTitle,
    screenplayTextRef,
    scenes,
    characters,
    locations,
    setScenes,
    setCharacters,
    setLocations,
    isSaving,
    isLoading,
    setIsLoading,
    syncStatus,
    isSaveVersionDialogOpen,
    setIsSaveVersionDialogOpen,
    handleSaveVersionWithMessage,
    handleTextChange,
    handleRestore,
    saveScreenplay,
    recordContentChange,
    initializeTimelapse,
  }), [
    screenplayText,
    screenplayTitle,
    scenes,
    characters,
    locations,
    isSaving,
    isLoading,
    syncStatus,
    isSaveVersionDialogOpen,
    // Stable references (callbacks via useCallback, setState, refs)
    setScreenplayText,
    handleSetScreenplayTitle,
    handleSaveVersionWithMessage,
    handleTextChange,
    handleRestore,
    saveScreenplay,
    recordContentChange,
    initializeTimelapse,
  ]);
}
