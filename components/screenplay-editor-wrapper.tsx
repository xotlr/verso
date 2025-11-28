"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ProseMirrorEditor } from "./prosemirror";
import { EditorFloatingPanel } from "./editor-floating-panel";
import { VersionHistorySidebar } from "./version-history-sidebar";
import { VersionCompareDialog } from "./version-compare-dialog";
import { SceneWorkspacePanel } from "./scene-workspace-panel";
import { ConflictDialog } from "./pwa/conflict-dialog";
import { Scene, Character, Location } from "@/types/screenplay";
import { ScreenplayVersion } from "@/types/version";
import { parseScreenplayText } from "@/lib/screenplay-utils";
import { proseMirrorToPlainText, isProseMirrorContent } from "@/lib/prosemirror";
import { useSettings } from "@/contexts/settings-context";
import { useOfflineSave } from "@/hooks/use-offline-save";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { SceneInfo, CharacterInfo } from "@/hooks/editor/useProseMirrorEditor";

interface ScreenplayEditorWrapperProps {
  projectId: string; // Actually screenplayId - keeping prop name for compatibility
}

type ScreenplayType = 'FEATURE' | 'TV' | 'SHORT';

export function ScreenplayEditorWrapper({ projectId: screenplayId }: ScreenplayEditorWrapperProps) {
  const [screenplayText, setScreenplayText] = useState("");
  const [screenplayTitle, setScreenplayTitle] = useState("Untitled Screenplay");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [compareVersion, setCompareVersion] = useState<ScreenplayVersion | null>(null);
  const [sceneWorkspaceScene, setSceneWorkspaceScene] = useState<Scene | null>(null);
  const [initialServerUpdatedAt, setInitialServerUpdatedAt] = useState<number | undefined>();
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const versionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVersionContentRef = useRef<string>("");

  // Offline save hook for local-first saving
  const {
    save: offlineSave,
    syncStatus,
    isOnline,
    isSyncing,
    pendingCount,
    forceSync,
    resolveConflict,
    conflictData,
  } = useOfflineSave({
    screenplayId,
    initialServerUpdatedAt,
    onConflict: () => setShowConflictDialog(true),
  });

  const isSaving = isSyncing || syncStatus === 'syncing';

  // TV/Episode fields
  const [screenplayType, setScreenplayType] = useState<ScreenplayType>('FEATURE');
  const [season, setSeason] = useState<number | null>(null);
  const [episode, setEpisode] = useState<number | null>(null);
  const [episodeTitle, setEpisodeTitle] = useState<string | null>(null);

  const { settings } = useSettings();
  const layoutMode = settings.layout.layoutMode;

  // Load screenplay from database
  useEffect(() => {
    const loadScreenplay = async () => {
      try {
        const response = await fetch(`/api/screenplays/${screenplayId}`);
        if (response.ok) {
          const screenplay = await response.json();
          setScreenplayText(screenplay.content || "");
          setScreenplayTitle(screenplay.title || "Untitled Screenplay");
          const parsed = parseScreenplayText(screenplay.content || "");
          setScenes(parsed.scenes || []);
          setCharacters(parsed.characters || []);
          setLocations(parsed.locations || []);

          // Track server timestamp for conflict detection
          if (screenplay.updatedAt) {
            setInitialServerUpdatedAt(new Date(screenplay.updatedAt).getTime());
          }

          // Load TV/Episode fields
          setScreenplayType(screenplay.type || 'FEATURE');
          setSeason(screenplay.season || null);
          setEpisode(screenplay.episode || null);
          setEpisodeTitle(screenplay.episodeTitle || null);
        }
      } catch (error) {
        console.error("Error loading screenplay:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadScreenplay();
  }, [screenplayId]);

  // Create a version snapshot
  const createVersion = useCallback(async (
    content: string,
    reason: "manual" | "auto" | "interval" | "restore"
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
        }),
      });

      if (response.ok) {
        lastVersionContentRef.current = content;
        if (reason === "manual") {
          toast.success("Version saved");
        }
      }
    } catch (error) {
      console.error("Error creating version:", error);
    }
  }, [screenplayId]);

  // Save screenplay to database (local-first)
  const saveScreenplay = useCallback(async (content: string, createVersionSnapshot = false) => {
    try {
      // Use offline-capable save
      await offlineSave(content, screenplayTitle);

      // Create version on manual save
      if (createVersionSnapshot) {
        await createVersion(content, "manual");
      }
    } catch (error) {
      console.error("Error saving screenplay:", error);
    }
  }, [offlineSave, screenplayTitle, createVersion]);

  // Debounced auto-save
  const handleTextChange = useCallback((text: string) => {
    setScreenplayText(text);
    const parsed = parseScreenplayText(text);
    setScenes(parsed.scenes || []);
    setCharacters(parsed.characters || []);
    setLocations(parsed.locations || []);

    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveScreenplay(text);
    }, 2000); // Auto-save after 2 seconds of inactivity
  }, [saveScreenplay]);

  // Interval-based versioning (every 30 minutes)
  useEffect(() => {
    versionIntervalRef.current = setInterval(() => {
      if (screenplayText && screenplayText !== lastVersionContentRef.current) {
        createVersion(screenplayText, "interval");
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => {
      if (versionIntervalRef.current) {
        clearInterval(versionIntervalRef.current);
      }
    };
  }, [screenplayText, createVersion]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle restore from version history
  const handleRestore = useCallback((content: string) => {
    setScreenplayText(content);
    const parsed = parseScreenplayText(content);
    setScenes(parsed.scenes || []);
    setCharacters(parsed.characters || []);
    setLocations(parsed.locations || []);
    saveScreenplay(content);
  }, [saveScreenplay]);

  // Handle conflict resolution
  const handleConflictResolve = useCallback((resolution: 'local' | 'server', content: string) => {
    if (resolution === 'server') {
      // Use server version - update the editor content
      setScreenplayText(content);
      const parsed = parseScreenplayText(content);
      setScenes(parsed.scenes || []);
      setCharacters(parsed.characters || []);
      setLocations(parsed.locations || []);
    }
    resolveConflict(resolution);
    setShowConflictDialog(false);
    toast.success(
      resolution === 'local'
        ? 'Your local changes have been saved'
        : 'Updated to server version'
    );
  }, [resolveConflict]);

  // Handle TV/Episode field updates
  const handleEpisodeInfoChange = useCallback(async (updates: {
    type?: ScreenplayType;
    season?: number | null;
    episode?: number | null;
    episodeTitle?: string | null;
  }) => {
    // Update local state
    if (updates.type !== undefined) setScreenplayType(updates.type);
    if (updates.season !== undefined) setSeason(updates.season);
    if (updates.episode !== undefined) setEpisode(updates.episode);
    if (updates.episodeTitle !== undefined) setEpisodeTitle(updates.episodeTitle);

    // Save to database
    try {
      await fetch(`/api/screenplays/${screenplayId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error("Error updating episode info:", error);
    }
  }, [screenplayId]);

  // Handle scene/character extraction from ProseMirror
  // Must be declared before early return to follow React hooks rules
  const handleScenesChange = useCallback((sceneInfos: SceneInfo[], charInfos: CharacterInfo[]) => {
    // Convert ProseMirror SceneInfo to existing Scene type
    const convertedScenes: Scene[] = sceneInfos.map((s, idx) => ({
      id: s.id,
      number: idx + 1,
      heading: `${s.type}. ${s.location} - ${s.timeOfDay}`,
      location: {
        id: s.location.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: s.location,
        type: s.type as 'INT' | 'EXT' | 'INT/EXT',
        color: '#666',
      },
      timeOfDay: s.timeOfDay as Scene['timeOfDay'],
      elements: [],
      characters: [],
    }));
    setScenes(convertedScenes);

    // Convert ProseMirror CharacterInfo to existing Character type
    const convertedChars: Character[] = charInfos.map((c) => ({
      id: c.id,
      name: c.name,
      color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      appearances: [],
    }));
    setCharacters(convertedChars);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl p-8">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full relative", `layout-${layoutMode}`)}>
      <ProseMirrorEditor
        content={screenplayText}
        onContentChange={handleTextChange}
        onScenesChange={handleScenesChange}
        onSave={() => saveScreenplay(screenplayText, true)}
        isSaving={isSaving}
        editable={true}
        showElementIndicator={true}
        showStats={true}
      />
      <EditorFloatingPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        scenes={scenes}
        characters={characters}
        locations={locations}
        selectedScene={scenes.find(s => s.id === selectedSceneId)}
        onSceneClick={(scene) => {
          setSelectedSceneId(scene.id);
        }}
        onOpenSceneWorkspace={(scene) => setSceneWorkspaceScene(scene)}
      />
      <SceneWorkspacePanel
        screenplayId={screenplayId}
        scene={sceneWorkspaceScene}
        isOpen={!!sceneWorkspaceScene}
        onClose={() => setSceneWorkspaceScene(null)}
      />
      <VersionHistorySidebar
        screenplayId={screenplayId}
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        onRestore={handleRestore}
        onCompare={(version) => setCompareVersion(version)}
        currentContent={screenplayText}
      />
      <VersionCompareDialog
        isOpen={!!compareVersion}
        onClose={() => setCompareVersion(null)}
        currentContent={screenplayText}
        version={compareVersion}
        onRestore={handleRestore}
      />

      {/* Conflict Resolution Dialog */}
      <ConflictDialog
        isOpen={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        conflictData={conflictData}
        onResolve={handleConflictResolve}
      />
    </div>
  );
}
