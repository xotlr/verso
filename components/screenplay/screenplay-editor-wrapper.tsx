"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { ProseMirrorEditor } from "@/components/prosemirror";
import { EditorFloatingPanel } from "@/components/editor/editor-floating-panel";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { CollaborationAvatars } from "@/components/collaboration/CollaborationAvatars";
import { Scene, Character } from "@/types/screenplay";
import { ScreenplayVersion } from "@/types/version";
import { parseScreenplayText } from "@/lib/screenplay/utils";
import { useSettings } from "@/contexts/settings-context";
import { useYjsCollaboration } from "@/hooks/use-yjs-collaboration";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useShotManagement, useScreenplayPersistence, useScreenplayMetadata } from "@/hooks/screenplay";
import { useEditorStatus } from "@/contexts/editor-status-context";
import { useEditorBreadcrumb } from "@/contexts/editor-breadcrumb-context";
import type { SceneInfo, CharacterInfo } from "@/hooks/editor/use-prosemirror-editor";
import type { EditorView } from "prosemirror-view";
import type { DetectedShot, Shot } from "@/types/shotlist";
import { SHOT_TYPES } from "@/types/shotlist";
import { useEditorScenesOptional } from "@/contexts/editor-scene-context";
import { EditorCommandsProvider } from "@/contexts/editor-commands-context";
import { useEditorDialogs } from "@/hooks/editor/use-editor-dialogs";
import { useEditorCommandsStore } from "@/stores/editor-commands";

// Lazy-load heavy dialog components to reduce initial bundle size
const VersionHistorySidebar = dynamic(
  () => import("@/components/version-history/version-history-sidebar").then(m => ({ default: m.VersionHistorySidebar })),
  { ssr: false }
);
const VersionCompareDialog = dynamic(
  () => import("@/components/version-history/version-compare-dialog").then(m => ({ default: m.VersionCompareDialog })),
  { ssr: false }
);
const VersionCompareTwoDialog = dynamic(
  () => import("@/components/version-history/version-compare-two-dialog").then(m => ({ default: m.VersionCompareTwoDialog })),
  { ssr: false }
);
const SaveVersionDialog = dynamic(
  () => import("@/components/version-history/save-version-dialog").then(m => ({ default: m.SaveVersionDialog })),
  { ssr: false }
);
const SceneWorkspacePanel = dynamic(
  () => import("@/components/scene-workspace-panel").then(m => ({ default: m.SceneWorkspacePanel })),
  { ssr: false }
);
const ScreenplayDetailsDrawer = dynamic(
  () => import("./screenplay-details-drawer").then(m => ({ default: m.ScreenplayDetailsDrawer })),
  { ssr: false }
);
const ShareDialogEnhanced = dynamic(
  () => import("@/components/share/share-dialog-enhanced/ShareDialogEnhanced").then(m => ({ default: m.ShareDialogEnhanced })),
  { ssr: false }
);
const ShotEditor = dynamic(
  () => import("@/components/shotlist/shot-editor").then(m => ({ default: m.ShotEditor })),
  { ssr: false }
);
const ExportDialog = dynamic(
  () => import("@/components/export-dialog").then(m => ({ default: m.ExportDialog })),
  { ssr: false }
);
const ConflictDialog = dynamic(
  () => import("@/components/pwa/conflict-dialog").then(m => ({ default: m.ConflictDialog })),
  { ssr: false }
);

interface ScreenplayEditorWrapperProps {
  projectId: string; // Actually screenplayId - keeping prop name for compatibility
  onTitleChange?: (title: string) => void;
}

export function ScreenplayEditorWrapper({ projectId: screenplayId, onTitleChange }: ScreenplayEditorWrapperProps) {

  const router = useRouter();
  const { data: session } = useSession();
  const editorSceneContext = useEditorScenesOptional();

  // Context hooks for cross-component communication (replaces window events)
  const editorStatus = useEditorStatus();
  const editorBreadcrumb = useEditorBreadcrumb();

  // Core persistence hook (handles save, version, timelapse, offline sync)
  const persistence = useScreenplayPersistence({
    screenplayId,
    onTitleChange,
    skipInitialLoad: true, // We load with metadata below
  });

  // Dialog/drawer state (centralized in hook)
  const dialogs = useEditorDialogs();

  // Metadata state (centralized in hook)
  const metadata = useScreenplayMetadata();

  // UI state
  const [selectedSceneId, setSelectedSceneId] = useState<string | undefined>();
  const [sceneWorkspaceScene, setSceneWorkspaceScene] = useState<Scene | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [sceneInfos, setSceneInfos] = useState<SceneInfo[]>([]);
  const [charInfos, setCharInfos] = useState<CharacterInfo[]>([]);
  const [detectedShots, setDetectedShots] = useState<DetectedShot[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);

  // Shot management hook
  const {
    setShots,
    scenesWithShots,
    shotEditorOpen,
    setShotEditorOpen,
    editingShot,
    pendingDetectedShot,
    handleShotsChange,
    handleAddShot,
    handleEditShot,
    handleAddDetectedShot,
    handleSaveShot,
  } = useShotManagement({
    screenplayId,
    sceneInfos,
  });

  const { settings } = useSettings();
  const layoutMode = settings.layout.layoutMode;

  // Generate a stable user color based on user ID
  const userColor = useMemo(() => {
    if (!session?.user?.id) return '#666666';
    // Generate a color from user ID hash
    const hash = session.user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }, [session?.user?.id]);

  // Yjs CRDT collaboration for real-time document sync (always enabled)
  const yjsEnabled = settings.editor.yjsCollaboration ?? true;
  const yjsCollaboration = useYjsCollaboration({
    screenplayId,
    userId: session?.user?.id ?? '',
    userInfo: {
      name: session?.user?.name ?? 'Anonymous',
      email: session?.user?.email ?? '',
      image: session?.user?.image,
    },
    enabled: yjsEnabled && !!session?.user?.id,
    initialContent: persistence.screenplayText,
  });

  // Update Yjs connection status via context (replaces window event)
  useEffect(() => {
    editorStatus.setYjsStatus({
      enabled: yjsEnabled,
      isConnected: yjsCollaboration.isConnected,
      isSynced: yjsCollaboration.isSynced,
      isPersistenceSynced: yjsCollaboration.isPersistenceSynced,
    });
  }, [editorStatus, yjsEnabled, yjsCollaboration.isConnected, yjsCollaboration.isSynced, yjsCollaboration.isPersistenceSynced]);

  // Sync editor scene data to EditorSceneContext for sidebar consumption
  useEffect(() => {
    if (editorSceneContext) {
      editorSceneContext.setScenes(sceneInfos);
      editorSceneContext.setCurrentSceneId(currentSceneId);
      editorSceneContext.setEditorView(editorView);
      editorSceneContext.setScreenplayId(screenplayId);
    }
  }, [editorSceneContext, sceneInfos, currentSceneId, editorView, screenplayId]);

  // Destructure stable refs from persistence (do this once to avoid re-render loops)
  // The persistence object changes every render, but these callbacks are stable
  const {
    handleTextChange: persistenceHandleTextChange,
    setScenes,
    setCharacters,
  } = persistence;

  // Load screenplay and metadata from database
  // Uses combined endpoint to avoid duplicate auth/access checks
  useEffect(() => {
    const loadScreenplay = async () => {
      try {
        // Single request for both screenplay and shots - eliminates duplicate auth overhead
        const res = await fetch(`/api/screenplays/${screenplayId}/editor-data`);

        if (res.ok) {
          const { screenplay, shots } = await res.json();

          // Set content via persistence hook
          persistence.setScreenplayText(screenplay.content || "");
          persistence.setScreenplayTitle(screenplay.title || "Untitled Screenplay");

          const parsed = parseScreenplayText(screenplay.content || "");
          persistence.setScenes(parsed.scenes || []);
          persistence.setCharacters(parsed.characters || []);
          persistence.setLocations(parsed.locations || []);

          // Load metadata via hook
          metadata.setFromScreenplay(screenplay);

          // Set breadcrumb via context if this screenplay belongs to a series
          if (screenplay.series) {
            editorBreadcrumb.setBreadcrumb({
              series: screenplay.series,
              season: screenplay.seasonRef,
              episode: { episode: screenplay.episode, episodeTitle: screenplay.episodeTitle },
            });
          } else {
            editorBreadcrumb.clearBreadcrumb();
          }

          // Initialize timelapse
          persistence.initializeTimelapse(screenplay.content || "");

          // Set shots from combined response
          setShots(shots || []);
        }
      } catch (error) {
        console.error("Error loading screenplay:", error);
      } finally {
        persistence.setIsLoading(false);
      }
    };

    loadScreenplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenplayId]);

  // Handle text changes (Yjs handles real-time sync automatically via CRDT)
  const handleTextChange = useCallback((text: string) => {
    persistenceHandleTextChange(text);
  }, [persistenceHandleTextChange]);

  // Editor command handlers (exposed via EditorCommandsProvider)
  const handleSaveTitle = useCallback((newTitle: string) => {
    persistence.setScreenplayTitle(newTitle);
  }, [persistence]);

  // Register editor commands with Zustand store (so header can call them)
  const registerCommands = useEditorCommandsStore((s) => s.register);
  const unregisterCommands = useEditorCommandsStore((s) => s.unregister);

  useEffect(() => {
    registerCommands({
      openShare: dialogs.openShare,
      openExport: dialogs.openExport,
      openVersionHistory: dialogs.openVersionHistory,
      openTimelapse: () => router.push(`/screenplay/${screenplayId}/timelapse`),
      saveTitle: (title: string) => persistence.setScreenplayTitle(title),
    });

    return () => unregisterCommands();
  }, [registerCommands, unregisterCommands, dialogs.openShare, dialogs.openExport, dialogs.openVersionHistory, router, screenplayId, persistence]);

  // Handle scene/character extraction from ProseMirror
  // Must be declared before early return to follow React hooks rules
  const handleScenesChange = useCallback((newSceneInfos: SceneInfo[], newCharInfos: CharacterInfo[], newDetectedShots: DetectedShot[]) => {
    // Store ProseMirror scene/char infos for sidebars
    setSceneInfos(newSceneInfos);
    setCharInfos(newCharInfos);
    setDetectedShots(newDetectedShots);

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
  }, [setScenes, setCharacters]);

  if (persistence.isLoading) {
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
    <EditorCommandsProvider
      screenplayId={screenplayId}
      onOpenShare={dialogs.openShare}
      onOpenExport={dialogs.openExport}
      onOpenVersionHistory={dialogs.openVersionHistory}
      onSaveTitle={handleSaveTitle}
    >
      <div className={cn("h-full flex", `layout-${layoutMode}`)}>
        {/* Left Sidebar Panel - Push layout (extends from left sidebar) */}
        <EditorPanel
          scenes={sceneInfos}
          characters={charInfos}
          view={editorView}
          currentSceneId={currentSceneId}
          screenplayId={screenplayId}
          detectedShots={detectedShots}
          scenesWithShots={scenesWithShots}
          onShotsChange={handleShotsChange}
          onAddShot={handleAddShot}
          onEditShot={handleEditShot}
          onAddDetectedShot={handleAddDetectedShot}
        />

        {/* Main content area - editor (flex-1 takes remaining space) */}
        <div className="flex-1 relative h-full isolate min-w-0">
          {/* Collaboration Avatars - floating in top right (Yjs awareness) */}
          <div className="fixed top-4 right-4 z-30">
            <CollaborationAvatars
              remoteUsers={yjsCollaboration.remoteUsers}
              isConnected={yjsCollaboration.isConnected}
            />
          </div>

          <ProseMirrorEditor
            content={persistence.screenplayText}
            onContentChange={handleTextChange}
            onScenesChange={handleScenesChange}
            onCurrentSceneChange={setCurrentSceneId}
            onSave={() => persistence.saveScreenplay(persistence.screenplayText, true)}
            onViewReady={setEditorView}
            isSaving={persistence.isSaving}
            editable={true}
            showElementIndicator={true}
            showStats={true}
            scenes={sceneInfos}
            characters={charInfos}
            onTimelapse={() => router.push(`/screenplay/${screenplayId}/timelapse`)}
            onToggleVersionHistory={dialogs.openVersionHistory}
            scenesCount={sceneInfos.length}
            charactersCount={charInfos.length}
            shotlistCount={detectedShots.length}
            notesCount={0}
            // Yjs CRDT collaboration (when enabled in settings)
            yXmlFragment={yjsEnabled ? yjsCollaboration.yXmlFragment ?? undefined : undefined}
            awareness={yjsEnabled ? yjsCollaboration.awareness ?? undefined : undefined}
            yjsUserInfo={yjsEnabled ? { name: session?.user?.name ?? 'Anonymous', color: userColor } : undefined}
            // Scroll position persistence
            documentId={screenplayId}
          />
        </div>

      {/* Floating panels and dialogs */}
      <EditorFloatingPanel
        isOpen={dialogs.isPanelOpen}
        onClose={dialogs.closePanel}
        scenes={persistence.scenes}
        characters={persistence.characters}
        locations={persistence.locations}
        selectedScene={persistence.scenes.find(s => s.id === selectedSceneId)}
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
        isOpen={dialogs.isVersionHistoryOpen}
        onClose={dialogs.closeVersionHistory}
        onRestore={persistence.handleRestore}
        onCompare={dialogs.setCompareVersion}
        onCompareTwoVersions={(fromVersion, toVersion) => dialogs.setCompareTwoVersions({ from: fromVersion, to: toVersion })}
        onSaveVersion={() => persistence.setIsSaveVersionDialogOpen(true)}
        currentContent={persistence.screenplayText}
      />
      <VersionCompareDialog
        isOpen={!!dialogs.compareVersion}
        onClose={dialogs.closeCompare}
        currentContent={persistence.screenplayText}
        version={dialogs.compareVersion}
        onRestore={persistence.handleRestore}
      />
      <ScreenplayDetailsDrawer
        isOpen={dialogs.isDetailsOpen}
        onClose={dialogs.closeDetails}
        screenplayId={screenplayId}
        logline={metadata.logline}
        genre={metadata.genre}
        author={metadata.author}
        type={metadata.screenplayType === 'FEATURE' || metadata.screenplayType === 'SHORT' ? 'FILM' : metadata.screenplayType === 'TV' ? 'TV' : undefined}
        season={metadata.season}
        episode={metadata.episode}
        episodeTitle={metadata.episodeTitle}
        titlePageFields={metadata.titlePageFields}
      />
      <ShareDialogEnhanced
        open={dialogs.isShareDialogOpen}
        onOpenChange={dialogs.setIsShareDialogOpen}
        screenplayId={screenplayId}
        screenplayTitle={persistence.screenplayTitle}
      />
      <SaveVersionDialog
        isOpen={persistence.isSaveVersionDialogOpen}
        onClose={() => persistence.setIsSaveVersionDialogOpen(false)}
        onSave={persistence.handleSaveVersionWithMessage}
      />
      <VersionCompareTwoDialog
        isOpen={!!dialogs.compareTwoVersions}
        onClose={dialogs.closeCompareTwo}
        fromVersion={dialogs.compareTwoVersions?.from ?? null}
        toVersion={dialogs.compareTwoVersions?.to ?? null}
        onRestore={persistence.handleRestore}
      />
      <ShotEditor
        open={shotEditorOpen}
        onOpenChange={setShotEditorOpen}
        shot={editingShot || (pendingDetectedShot ? {
          id: '',
          sceneId: pendingDetectedShot.sceneId || '',
          screenplayId,
          description: pendingDetectedShot.subject || pendingDetectedShot.lineContent,
          shotNumber: 0,
          status: 'planned' as const,
          shotType: SHOT_TYPES.includes(pendingDetectedShot.shotType as typeof SHOT_TYPES[number])
            ? (pendingDetectedShot.shotType as Shot['shotType'])
            : null,
          cameraAngle: null,
          movement: null,
          duration: null,
          lens: null,
          equipment: null,
          lighting: null,
          audio: null,
          notes: null,
          thumbnailUrl: null,
          thumbnailType: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } : null)}
        onSave={handleSaveShot}
      />
      <ExportDialog
        isOpen={dialogs.isExportDialogOpen}
        onClose={dialogs.closeExport}
        title={persistence.screenplayTitle}
        author={session?.user?.name || ''}
        content={persistence.screenplayText}
        scenes={persistence.scenes}
        sceneNumbering={{ enabled: false, startNumber: 1, side: 'both' }}
        revisionColor="white"
      />
      <ConflictDialog
        isOpen={!!persistence.conflictData}
        onClose={persistence.clearConflict}
        conflictData={persistence.conflictData}
        onResolve={persistence.resolveConflict}
      />
      </div>
    </EditorCommandsProvider>
  );
}
