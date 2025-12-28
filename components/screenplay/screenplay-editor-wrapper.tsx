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
import { useShotManagement, useScreenplayPersistence } from "@/hooks/screenplay";
import type { SceneInfo, CharacterInfo } from "@/hooks/editor/use-prosemirror-editor";
import type { EditorView } from "prosemirror-view";
import type { DetectedShot, Shot } from "@/types/shotlist";

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

interface ScreenplayEditorWrapperProps {
  projectId: string; // Actually screenplayId - keeping prop name for compatibility
  onTitleChange?: (title: string) => void;
}

type ScreenplayType = 'FEATURE' | 'TV' | 'SHORT';

export function ScreenplayEditorWrapper({ projectId: screenplayId, onTitleChange }: ScreenplayEditorWrapperProps) {

  const router = useRouter();
  const { data: session } = useSession();

  // Core persistence hook (handles save, version, timelapse, offline sync)
  const persistence = useScreenplayPersistence({
    screenplayId,
    onTitleChange,
    skipInitialLoad: true, // We load with metadata below
  });

  // UI state
  const [selectedSceneId, setSelectedSceneId] = useState<string | undefined>();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [compareVersion, setCompareVersion] = useState<ScreenplayVersion | null>(null);
  const [sceneWorkspaceScene, setSceneWorkspaceScene] = useState<Scene | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [compareTwoVersions, setCompareTwoVersions] = useState<{from: ScreenplayVersion, to: ScreenplayVersion} | null>(null);
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

  // Broadcast Yjs connection status to header
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('yjs-status-update', {
      detail: {
        enabled: yjsEnabled,
        isConnected: yjsCollaboration.isConnected,
        isSynced: yjsCollaboration.isSynced,
        isPersistenceSynced: yjsCollaboration.isPersistenceSynced,
      },
    }));
  }, [yjsEnabled, yjsCollaboration.isConnected, yjsCollaboration.isSynced, yjsCollaboration.isPersistenceSynced]);

  // Destructure stable refs from persistence (do this once to avoid re-render loops)
  // The persistence object changes every render, but these callbacks are stable
  const {
    handleTextChange: persistenceHandleTextChange,
    setScenes,
    setCharacters,
  } = persistence;

  // Load screenplay and metadata from database
  useEffect(() => {
    const loadScreenplay = async () => {
      try {
        const [screenplayRes, shotsRes] = await Promise.all([
          fetch(`/api/screenplays/${screenplayId}`),
          fetch(`/api/screenplays/${screenplayId}/shots`),
        ]);

        if (screenplayRes.ok) {
          const screenplay = await screenplayRes.json();

          // Set content via persistence hook
          persistence.setScreenplayText(screenplay.content || "");
          persistence.setScreenplayTitle(screenplay.title || "Untitled Screenplay");

          const parsed = parseScreenplayText(screenplay.content || "");
          persistence.setScenes(parsed.scenes || []);
          persistence.setCharacters(parsed.characters || []);
          persistence.setLocations(parsed.locations || []);

          // Load metadata fields (not in persistence hook)
          setScreenplayType(screenplay.type || 'FEATURE');
          setSeason(screenplay.season || null);
          setEpisode(screenplay.episode || null);
          setEpisodeTitle(screenplay.episodeTitle || null);
          setLogline(screenplay.logline || null);
          setGenre(screenplay.genre || null);
          setAuthor(screenplay.author || null);
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
                episode: { episode: screenplay.episode, episodeTitle: screenplay.episodeTitle },
              },
            }));
          }

          // Initialize timelapse
          persistence.initializeTimelapse(screenplay.content || "");
        }

        if (shotsRes.ok) {
          const data = await shotsRes.json();
          setShots(data.shots || []);
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

  // Listen for share dialog open events from header
  useEffect(() => {
    const handleOpenShare = () => {
      setIsShareDialogOpen(true);
    };

    window.addEventListener('editor-open-share', handleOpenShare);
    return () => window.removeEventListener('editor-open-share', handleOpenShare);
  }, []);

  // Listen for timelapse open events from header
  useEffect(() => {
    const handleOpenTimelapse = () => {
      router.push(`/screenplay/${screenplayId}/timelapse`);
    };

    window.addEventListener('editor-open-timelapse', handleOpenTimelapse);
    return () => window.removeEventListener('editor-open-timelapse', handleOpenTimelapse);
  }, [router, screenplayId]);

  // Listen for version history open events from header
  useEffect(() => {
    const handleOpenVersionHistory = () => {
      setIsVersionHistoryOpen(true);
    };

    window.addEventListener('editor-open-version-history', handleOpenVersionHistory);
    return () => window.removeEventListener('editor-open-version-history', handleOpenVersionHistory);
  }, []);

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
      <div className={cn("h-full flex", `layout-${layoutMode}`)}>
        {/* Activity Bar + Secondary Panel - Scenes & Characters */}
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

      {/* Main content area - editor */}
      <div className="flex-1 relative h-full">
        {/* Collaboration Avatars - floating in top right (Yjs awareness) */}
        <div className="fixed top-4 right-4 z-50">
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
          onToggleVersionHistory={() => setIsVersionHistoryOpen(true)}
          scenesCount={sceneInfos.length}
          charactersCount={charInfos.length}
          shotlistCount={detectedShots.length}
          notesCount={0}
          // Yjs CRDT collaboration (when enabled in settings)
          yXmlFragment={yjsEnabled ? yjsCollaboration.yXmlFragment ?? undefined : undefined}
          awareness={yjsEnabled ? yjsCollaboration.awareness ?? undefined : undefined}
          yjsUserInfo={yjsEnabled ? { name: session?.user?.name ?? 'Anonymous', color: userColor } : undefined}
        />
      </div>

      {/* Floating panels and dialogs */}
      <EditorFloatingPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
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
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        onRestore={persistence.handleRestore}
        onCompare={(version) => setCompareVersion(version)}
        onCompareTwoVersions={(fromVersion, toVersion) => setCompareTwoVersions({ from: fromVersion, to: toVersion })}
        onSaveVersion={() => persistence.setIsSaveVersionDialogOpen(true)}
        currentContent={persistence.screenplayText}
      />
      <VersionCompareDialog
        isOpen={!!compareVersion}
        onClose={() => setCompareVersion(null)}
        currentContent={persistence.screenplayText}
        version={compareVersion}
        onRestore={persistence.handleRestore}
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
      <ShareDialogEnhanced
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        screenplayId={screenplayId}
        screenplayTitle={persistence.screenplayTitle}
      />
      <SaveVersionDialog
        isOpen={persistence.isSaveVersionDialogOpen}
        onClose={() => persistence.setIsSaveVersionDialogOpen(false)}
        onSave={persistence.handleSaveVersionWithMessage}
      />
      <VersionCompareTwoDialog
        isOpen={!!compareTwoVersions}
        onClose={() => setCompareTwoVersions(null)}
        fromVersion={compareTwoVersions?.from ?? null}
        toVersion={compareTwoVersions?.to ?? null}
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
          shotType: (pendingDetectedShot.shotType as Shot['shotType']) || null,
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
      </div>
  );
}
