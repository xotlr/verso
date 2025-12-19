"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProseMirrorEditor } from "@/components/prosemirror";
import { EditorFloatingPanel } from "@/components/editor/editor-floating-panel";
import { VersionHistorySidebar } from "@/components/version-history/version-history-sidebar";
import { VersionCompareDialog } from "@/components/version-history/version-compare-dialog";
import { VersionCompareTwoDialog } from "@/components/version-history/version-compare-two-dialog";
import { SaveVersionDialog } from "@/components/version-history/save-version-dialog";
import { SceneWorkspacePanel } from "@/components/scene-workspace-panel";
import { ScreenplayDetailsDrawer } from "./screenplay-details-drawer";
import { ShareDialog } from "@/components/share-dialog";
import { EditorPanel, EditorPanelProvider } from "@/components/editor/EditorPanel";
import { CollaborationAvatars } from "@/components/collaboration/CollaborationAvatars";
import { Scene, Character, Location } from "@/types/screenplay";
import { ScreenplayVersion } from "@/types/version";
import { parseScreenplayText } from "@/lib/screenplay-utils";
import { useSettings } from "@/contexts/settings-context";
import { useOfflineSave } from "@/hooks/use-offline-save";
import { useCollaboration } from "@/hooks/use-collaboration";
import { useTimelapseRecorder } from "@/hooks/timelapse";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { SceneInfo, CharacterInfo } from "@/hooks/editor/use-prosemirror-editor";
import type { EditorView } from "prosemirror-view";
import type { CollaborationOperation } from "@/types/collaboration";

interface ScreenplayEditorWrapperProps {
  projectId: string; // Actually screenplayId - keeping prop name for compatibility
  onTitleChange?: (title: string) => void;
}

type ScreenplayType = 'FEATURE' | 'TV' | 'SHORT';

export function ScreenplayEditorWrapper({ projectId: screenplayId, onTitleChange }: ScreenplayEditorWrapperProps) {
  const router = useRouter();
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isSaveVersionDialogOpen, setIsSaveVersionDialogOpen] = useState(false);
  const [compareTwoVersions, setCompareTwoVersions] = useState<{from: ScreenplayVersion, to: ScreenplayVersion} | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [sceneInfos, setSceneInfos] = useState<SceneInfo[]>([]);
  const [charInfos, setCharInfos] = useState<CharacterInfo[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const versionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVersionContentRef = useRef<string>("");
  const screenplayTextRef = useRef(screenplayText);

  // Offline save hook for local-first saving
  const {
    save: offlineSave,
    syncStatus,
    isSyncing,
  } = useOfflineSave({
    screenplayId,
  });

  const isSaving = isSyncing || syncStatus === 'syncing';

  // Timelapse recording hook
  const {
    recordContentChange,
    initializeWithContent: initializeTimelapse,
  } = useTimelapseRecorder({
    screenplayId,
    enabled: true, // Always enabled - users can disable via settings
  });

  // TV/Episode fields
  const [screenplayType, setScreenplayType] = useState<ScreenplayType>('FEATURE');
  const [season, setSeason] = useState<number | null>(null);
  const [episode, setEpisode] = useState<number | null>(null);
  const [episodeTitle, setEpisodeTitle] = useState<string | null>(null);

  // Metadata fields
  const [logline, setLogline] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [author, setAuthor] = useState<string | null>(null);

  // Title page fields
  const [titlePageFields, setTitlePageFields] = useState<{
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    contactAddress?: string | null;
    copyrightYear?: number | null;
    copyrightHolder?: string | null;
    registrationNumber?: string | null;
    draftLabel?: string | null;
    draftDate?: string | null;
    showTitlePageContact?: boolean;
    showTitlePageCopyright?: boolean;
    showTitlePageDraft?: boolean;
  }>({});

  const { settings } = useSettings();
  const layoutMode = settings.layout.layoutMode;

  // Real-time collaboration
  const collaboration = useCollaboration({
    screenplayId,
    editorType: layoutMode === 'modern' ? 'prosemirror' : 'classic',
    enabled: true, // TODO: Make this conditional based on user permissions
    onRemoteChange: useCallback((operation: CollaborationOperation) => {
      // Handle remote changes from other users
      if (operation.operationType === 'replace' && operation.content) {
        // Update screenplay text with remote changes
        const remoteText = operation.content;

        // Only apply if different from current content
        if (remoteText !== screenplayTextRef.current) {
          console.log('📥 Applying remote change from', operation.userId);
          setScreenplayText(remoteText);
          screenplayTextRef.current = remoteText;

          // Parse and update scenes/characters
          const parsed = parseScreenplayText(remoteText);
          setScenes(parsed.scenes || []);
          setCharacters(parsed.characters || []);
          setLocations(parsed.locations || []);

          toast.info('Screenplay updated by collaborator', {
            duration: 2000,
          });
        }
      }
    }, []),
  });

  // Load screenplay from database
  useEffect(() => {
    const loadScreenplay = async () => {
      try {
        const response = await fetch(`/api/screenplays/${screenplayId}`);
        if (response.ok) {
          const screenplay = await response.json();
          setScreenplayText(screenplay.content || "");
          const title = screenplay.title || "Untitled Screenplay";
          setScreenplayTitle(title);
          if (onTitleChange) {
            onTitleChange(title);
          }
          const parsed = parseScreenplayText(screenplay.content || "");
          setScenes(parsed.scenes || []);
          setCharacters(parsed.characters || []);
          setLocations(parsed.locations || []);

          // Load TV/Episode fields
          setScreenplayType(screenplay.type || 'FEATURE');
          setSeason(screenplay.season || null);
          setEpisode(screenplay.episode || null);
          setEpisodeTitle(screenplay.episodeTitle || null);

          // Load metadata fields
          setLogline(screenplay.logline || null);
          setGenre(screenplay.genre || null);
          setAuthor(screenplay.author || null);

          // Load title page fields
          setTitlePageFields({
            contactName: screenplay.contactName,
            contactEmail: screenplay.contactEmail,
            contactPhone: screenplay.contactPhone,
            contactAddress: screenplay.contactAddress,
            copyrightYear: screenplay.copyrightYear,
            copyrightHolder: screenplay.copyrightHolder,
            registrationNumber: screenplay.registrationNumber,
            draftLabel: screenplay.draftLabel,
            draftDate: screenplay.draftDate ? new Date(screenplay.draftDate).toISOString().split('T')[0] : null,
            showTitlePageContact: screenplay.showTitlePageContact ?? true,
            showTitlePageCopyright: screenplay.showTitlePageCopyright ?? true,
            showTitlePageDraft: screenplay.showTitlePageDraft ?? true,
          });

          // Dispatch breadcrumb event if this screenplay belongs to a series
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

          // Initialize timelapse with current content
          initializeTimelapse(screenplay.content || "");
        }
      } catch (error) {
        console.error("Error loading screenplay:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadScreenplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenplayId]);

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

      // Show dialog for manual save to get commit message
      if (createVersionSnapshot) {
        setIsSaveVersionDialogOpen(true);
      }
    } catch (error) {
      console.error("Error saving screenplay:", error);
    }
  }, [offlineSave, screenplayTitle]);

  // Handle save with message from dialog
  const handleSaveVersionWithMessage = useCallback(async (message?: string) => {
    const currentContent = screenplayTextRef.current;
    await createVersion(currentContent, "manual", message);
  }, [createVersion]);

  // Debounced auto-save with ref pattern to prevent re-renders
  const handleTextChange = useCallback((text: string) => {
    // Store in ref - no re-render!
    screenplayTextRef.current = text;

    // Record for timelapse (debounced internally by the hook)
    recordContentChange(text);

    // Debounce save AND state updates
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      // Update state only when saving (every 2 seconds)
      setScreenplayText(text);

      // Parse scenes/characters only on save
      const parsed = parseScreenplayText(text);
      setScenes(parsed.scenes || []);
      setCharacters(parsed.characters || []);
      setLocations(parsed.locations || []);

      // Broadcast changes to collaborators
      if (collaboration.isConnected) {
        collaboration.broadcastChange({
          type: 'replace',
          content: text,
          cursorPosition: 0, // TODO: Get actual cursor position
        });
      }

      // Save to server
      saveScreenplay(text);
    }, 2000); // Auto-save after 2 seconds of inactivity
  }, [saveScreenplay, collaboration, recordContentChange]);

  // Sync ref with state on initial load and version restore
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
    }, 30 * 60 * 1000); // 30 minutes

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

  // Listen for title save events from header
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
        console.error('Failed to update title:', error);
        toast.error("Failed to update title");
      }
    };

    window.addEventListener('screenplay-title-save', handleTitleSave);
    return () => window.removeEventListener('screenplay-title-save', handleTitleSave);
  }, [screenplayId, onTitleChange]);

  // Listen for share dialog open events from header
  useEffect(() => {
    const handleOpenShare = () => {
      setIsShareDialogOpen(true);
    };

    window.addEventListener('editor-open-share', handleOpenShare);
    return () => window.removeEventListener('editor-open-share', handleOpenShare);
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

  // Handle TV/Episode field updates
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleEpisodeInfoChange = useCallback(async (updates: {
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
  const handleScenesChange = useCallback((newSceneInfos: SceneInfo[], newCharInfos: CharacterInfo[]) => {
    // Store ProseMirror scene/char infos for sidebars
    setSceneInfos(newSceneInfos);
    setCharInfos(newCharInfos);

    // Convert ProseMirror SceneInfo to existing Scene type
    const convertedScenes: Scene[] = newSceneInfos.map((s, idx) => ({
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
    const convertedChars: Character[] = newCharInfos.map((c) => ({
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

  // Classic Mode: DISABLED - scroll issues unresolved
  // Always use modern ProseMirror editor instead
  // if (layoutMode === 'classic') { ... }

  // Modern Mode: Use the ProseMirror-based editor
  return (
    <EditorPanelProvider>
      <div className={cn("h-full flex", `layout-${layoutMode}`)}>
        {/* Activity Bar + Secondary Panel - Scenes & Characters */}
        <EditorPanel
          scenes={sceneInfos}
          characters={charInfos}
          view={editorView}
          currentSceneId={currentSceneId}
          screenplayId={screenplayId}
        />

      {/* Main content area - editor */}
      <div className="flex-1 relative h-full">
        {/* Collaboration Avatars - floating in top right */}
        <div className="fixed top-4 right-4 z-50">
          <CollaborationAvatars
            remoteUsers={collaboration.remoteUsers}
            isConnected={collaboration.isConnected}
          />
        </div>

        <ProseMirrorEditor
          content={screenplayText}
          onContentChange={handleTextChange}
          onScenesChange={handleScenesChange}
          onCurrentSceneChange={setCurrentSceneId}
          onSave={() => saveScreenplay(screenplayText, true)}
          onViewReady={setEditorView}
          isSaving={isSaving}
          editable={true}
          showElementIndicator={true}
          showStats={true}
          scenes={sceneInfos}
          characters={charInfos}
          onTimelapse={() => router.push(`/screenplay/${screenplayId}/timelapse`)}
          onToggleVersionHistory={() => setIsVersionHistoryOpen(true)}
          scenesCount={sceneInfos.length}
          charactersCount={charInfos.length}
          shotlistCount={0}
          notesCount={0}
        />
      </div>

      {/* Floating panels and dialogs */}
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
        onCompareTwoVersions={(fromVersion, toVersion) => setCompareTwoVersions({ from: fromVersion, to: toVersion })}
        onSaveVersion={() => setIsSaveVersionDialogOpen(true)}
        currentContent={screenplayText}
      />
      <VersionCompareDialog
        isOpen={!!compareVersion}
        onClose={() => setCompareVersion(null)}
        currentContent={screenplayText}
        version={compareVersion}
        onRestore={handleRestore}
      />
      <ScreenplayDetailsDrawer
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        screenplayId={screenplayId}
        logline={logline}
        genre={genre}
        author={author}
        type={screenplayType === 'FEATURE' || screenplayType === 'SHORT' ? 'FILM' : screenplayType === 'TV' ? 'TV' : undefined}
        season={season}
        episode={episode}
        episodeTitle={episodeTitle}
        titlePageFields={titlePageFields}
      />
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        screenplayId={screenplayId}
        screenplayTitle={screenplayTitle}
      />
      <SaveVersionDialog
        isOpen={isSaveVersionDialogOpen}
        onClose={() => setIsSaveVersionDialogOpen(false)}
        onSave={handleSaveVersionWithMessage}
      />
      <VersionCompareTwoDialog
        isOpen={!!compareTwoVersions}
        onClose={() => setCompareTwoVersions(null)}
        fromVersion={compareTwoVersions?.from ?? null}
        toVersion={compareTwoVersions?.to ?? null}
        onRestore={handleRestore}
      />
      </div>
    </EditorPanelProvider>
  );
}
