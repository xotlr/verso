'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import {
  useProseMirrorEditor,
  SceneInfo,
  CharacterInfo,
} from '@/hooks/editor/use-prosemirror-editor';
import type { DetectedShot } from '@/types/shotlist';
import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { useResponsiveScale } from '@/hooks/editor/use-responsive-scale';
import { useEditorZoom } from '@/hooks/editor/use-editor-zoom';
import { useEditorSettings } from '@/hooks/editor/use-editor-settings';
import { useEditorHighlighting } from '@/hooks/editor/use-editor-highlighting';
import { useIsMobile } from '@/hooks/use-mobile';
import { PAGE_WIDTH_PX, PAGE_HEIGHT_PX } from '@/lib/constants';
import { FloatingToolbar } from './FloatingToolbar';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { EditorContextMenu } from './EditorContextMenu';
import { ElementToolbar } from './ElementToolbar';
import { RightToolbar } from '@/components/editor/RightToolbar';
// HighlightColor type used by setHighlightColor callback
import { EditorUnifiedToolbar } from '@/components/editor/EditorUnifiedToolbar';
import { EditorScrollArea, EDITOR_SCROLLBAR_WIDTH } from './EditorScrollArea';
import { PageFrameRenderer, PageGapRenderer } from './PageFrameRenderer';
import { createPageFramesFromWasm, PAGE_GAP_PX } from '@/lib/prosemirror/plugins/page-frames';
import { applyLayoutCSS, applyLayoutMetadataCSS, DEFAULT_FEATURE_FILM_CONFIG, type PaginationResult } from '@/lib/verso';
import { Button } from '@/components/ui/button';
import { MobileEditorToolbar } from '@/components/editor/mobile-editor-toolbar';
import { MobileSceneCharacterSheet } from '@/components/editor/MobileSceneCharacterSheet';
import { ZoomIndicator } from './ZoomIndicator';
import { StatsBar } from './StatsBar';
import { FindReplacePanel } from './FindReplacePanel';
import { TextSelection } from 'prosemirror-state';
import { updateTypewriterScrollSettings } from '@/lib/prosemirror/plugins';
import { useEditorFormatting } from '@/hooks/editor/use-editor-formatting';
import { useShortcutMatcher } from '@/lib/shortcuts/use-shortcut';
import { useScrollPersistence } from '@/hooks/use-scroll-persistence';
// Settings accessed via useEditorSettings hook
import { useDebugMetrics } from '@/components/analytics/debug-metrics-context';
import { BeginnerTips } from '@/components/editor/BeginnerTips';
import { TypingTestPanel } from './dev/TypingTestPanel';
import { VersoAnalysis } from '@/components/verso-analysis';
import { UpgradeDialog } from '@/components/upgrade-dialog';
import { canUseScriptCheck, type PlanType } from '@/lib/stripe';
import { useSession } from 'next-auth/react';
import '@/styles/editor/prosemirror.css';

export type ViewMode = 'discrete' | 'continuous';

export interface ProseMirrorEditorProps {
  content: string | null;
  onContentChange?: (content: string) => void;
  onScenesChange?: (scenes: SceneInfo[], characters: CharacterInfo[], detectedShots: DetectedShot[]) => void;
  onCurrentSceneChange?: (sceneId: string | null) => void;
  onSave?: () => void;
  onViewReady?: (view: import('prosemirror-view').EditorView) => void;
  editable?: boolean;
  className?: string;
  showElementIndicator?: boolean;
  showStats?: boolean;
  isSaving?: boolean;
  defaultViewMode?: ViewMode;
  // Mobile toolbar props
  scenes?: SceneInfo[];
  characters?: CharacterInfo[];
  onExportPDF?: () => void;
  onToggleVersionHistory?: () => void;
  onToggleFindReplace?: () => void;
  showLineNumbers?: boolean;
  showPageBreaks?: boolean;
  onToggleLineNumbers?: () => void;
  onTogglePageBreaks?: () => void;
  onTimelapse?: () => void;
  /** Enable timelapse playback mode - syncs content without recreating editor */
  timelapseMode?: boolean;
  /** Pre-computed pagination cache for timelapse playback (indexed by frame index) */
  paginationCache?: Map<number, PaginationResult>;
  /** Current timelapse frame index (used to look up cached pagination) */
  timelapseIndex?: number;
  // Activity bar counts for Maelle toolbar
  scenesCount?: number;
  charactersCount?: number;
  shotlistCount?: number;
  notesCount?: number;
  // Yjs CRDT collaboration options
  /** Yjs XmlFragment for collaborative editing */
  yXmlFragment?: Y.XmlFragment;
  /** Yjs Awareness for cursor/presence sync */
  awareness?: Awareness;
  /** User info for cursor display */
  yjsUserInfo?: {
    name: string;
    color: string;
  };
  /** Document ID for scroll position persistence */
  documentId?: string;
}

/**
 * Main ProseMirror screenplay editor component.
 */
export function ProseMirrorEditor({
  content,
  onContentChange,
  onScenesChange,
  onCurrentSceneChange,
  onSave,
  onViewReady,
  editable = true,
  className,
  showElementIndicator = true,
  showStats = true,
  isSaving = false,
  defaultViewMode = 'discrete',
  scenes = [],
  characters = [],
  onExportPDF,
  onToggleVersionHistory,
  onToggleFindReplace,
  showLineNumbers = false,
  showPageBreaks = true,
  onToggleLineNumbers,
  onTogglePageBreaks,
  onTimelapse,
  timelapseMode = false,
  paginationCache,
  timelapseIndex = 0,
  scenesCount = 0,
  charactersCount = 0,
  shotlistCount = 0,
  notesCount = 0,
  // Yjs CRDT collaboration
  yXmlFragment,
  awareness,
  yjsUserInfo,
  // Scroll persistence
  documentId,
}: ProseMirrorEditorProps) {
  // Consolidated editor settings hook
  const {
    viewMode,
    isDiscreteMode,
    toolbarLayout,
    pageStyle,
    showSceneNumbers,
    sceneNumberPosition,
    showPlaceholders,
    isReadingMode,
    effectiveEditable,
    showBeginnerTips,
    paperColor,
    highlightColor,
    spellcheck,
    autoCapitalize,
    toggleReadingMode,
    setHighlightColor,
    rawSettings: settings,
  } = useEditorSettings({
    defaultViewMode,
    timelapseMode,
    editable,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_currentSpread, setCurrentSpread] = useState(0);
  const [isInFocusMode, setIsInFocusMode] = useState(false);
  const [scenesSheetOpen, setScenesSheetOpen] = useState(false);
  const [scriptCheckOpen, setScriptCheckOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const isMobile = useIsMobile();

  // Session for plan checking
  const { data: session } = useSession();
  const userPlan = (session?.user?.plan as PlanType) || 'FREE';

  // Scroll persistence - saves/restores scroll position when reopening document
  const { scrollContainerRef } = useScrollPersistence({
    documentId: documentId || 'default',
    enabled: !!documentId && !timelapseMode,
  });

  // Responsive scaling - pages are fixed size and scaled with CSS transforms
  const { scale: responsiveScale } = useResponsiveScale(!isInFocusMode);

  // User-controlled zoom with gesture support
  const {
    zoom: scale,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    // isZoomed - available but not currently used
    fitToWidthScale,
  } = useEditorZoom({
    containerRef: scrollContainerRef,
    scrollContainerRef: scrollContainerRef,
    fitToWidthScale: responsiveScale,
  });

  // Toggle app-level focus mode (hides sidebar + header)
  const toggleFocusMode = useCallback(() => {
    window.dispatchEvent(new CustomEvent('focus-mode-toggle'));
  }, []);

  // Listen for focus mode changes to hide view switcher
  useEffect(() => {
    const handleFocusModeChange = () => {
      setIsInFocusMode((prev) => !prev);
    };
    window.addEventListener('focus-mode-toggle', handleFocusModeChange);
    return () => window.removeEventListener('focus-mode-toggle', handleFocusModeChange);
  }, []);

  // Listen for reading mode toggle events
  useEffect(() => {
    const handleReadingModeToggle = () => {
      toggleReadingMode();
    };
    window.addEventListener('reading-mode-toggle', handleReadingModeToggle);
    return () => window.removeEventListener('reading-mode-toggle', handleReadingModeToggle);
  }, [toggleReadingMode]);

  // Apply layout CSS from WASM config on mount
  // This sets initial CSS variables from the config
  useEffect(() => {
    applyLayoutCSS(DEFAULT_FEATURE_FILM_CONFIG);
  }, []);

  // Debug metrics context (dev only) - get early for passing to hook
  const debugMetrics = useDebugMetrics();

  const {
    containerRef,
    currentElementType,
    currentSceneId,
    wordCount,
    pageCount,
    isReady,
    view,
    autocompleteState,
    applyAutocompleteSuggestion,
    canUndo,
    canRedo,
    undo: handleUndo,
    redo: handleRedo,
    paginationResult: livePaginationResult,
    paginationError,
    isWasmReady,
  } = useProseMirrorEditor({
    initialContent: content,
    onUpdate: onContentChange,
    onScenesChange,
    editable: effectiveEditable,
    showSceneNumbers,
    sceneNumberPosition,
    timelapseMode,
    spellcheck,
    autoCapitalize,
    // Yjs CRDT collaboration options
    yXmlFragment,
    awareness,
    yjsUserInfo,
    // Debug metrics callbacks (dev only)
    onKeystrokeLatency: debugMetrics?.pushKeystrokeLatency,
    onTransactionTime: debugMetrics?.setTransactionTime,
  });

  // Highlighting system hook - manages highlight/eraser modes and mark application
  const {
    isHighlightActive,
    isEraserActive,
    toggleHighlight,
    toggleEraser,
  } = useEditorHighlighting({
    view,
    highlightColor,
    onHighlightColorChange: setHighlightColor,
  });

  // Formatting actions hook
  const {
    handleInsertElement,
    handleBold,
    handleItalic,
    handleUnderline,
  } = useEditorFormatting(view);

  // In timelapse mode, use pre-computed cached pagination for accurate page frames
  // Fall back to live result if cache miss (e.g., sampled cache)
  const effectivePaginationResult = useMemo(() => {
    if (timelapseMode && paginationCache) {
      // First try exact index match
      const cachedResult = paginationCache.get(timelapseIndex);
      if (cachedResult) {
        return cachedResult;
      }
      // For sampled caches, find nearest cached result below current index
      let nearestKey = -1;
      for (const key of paginationCache.keys()) {
        if (key <= timelapseIndex && key > nearestKey) {
          nearestKey = key;
        }
      }
      if (nearestKey >= 0) {
        return paginationCache.get(nearestKey);
      }
    }
    // Fall back to live pagination result
    return livePaginationResult;
  }, [timelapseMode, paginationCache, timelapseIndex, livePaginationResult]);

  // Use the effective pagination result for rendering
  const paginationResult = effectivePaginationResult;

  // Apply layout metadata CSS from WASM pagination result
  // This is the SINGLE SOURCE OF TRUTH - updates CSS variables with actual WASM calculations
  useEffect(() => {
    if (paginationResult?.stats.layout) {
      applyLayoutMetadataCSS(paginationResult.stats.layout);
    }
  }, [paginationResult]);

  // Log pagination errors in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && paginationError) {
      console.error('[ProseMirrorEditor] Pagination error:', paginationError);
    }
  }, [paginationError]);

  // Log WASM readiness status
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ProseMirrorEditor] WASM ready:', isWasmReady, 'Result:', !!paginationResult);
    }
  }, [isWasmReady, paginationResult]);

  // Push WASM pagination stats to debug panel (dev only)
  // Extract stable callbacks to avoid infinite loop - the context object changes
  // when state updates, but the callbacks themselves are stable (useCallback with [])
  const setWasmStats = debugMetrics?.setWasmStats;
  const setWasmReady = debugMetrics?.setWasmReady;
  useEffect(() => {
    if (!setWasmStats || !setWasmReady || !paginationResult?.stats) return;
    setWasmStats(paginationResult.stats, paginationResult.stats.layout ?? null);
    setWasmReady(true);
  }, [setWasmStats, setWasmReady, paginationResult]);

  // Create page frames from WASM pagination result
  // WASM now handles all positioning including title page offset
  // pixel_y values are absolute - no JS offset calculations needed
  const pageFrames = useMemo(() => {
    if (!paginationResult) {
      // No WASM result yet - show single page placeholder
      return [{
        pageNumber: 1,
        pageIdentifier: { type: 'Sequential' as const, value: 1 },
        yOffset: 0,
        hasMoreMarker: false,
        isFirstPage: true,
      }];
    }

    // WASM result includes title page (if present) and all content pages
    // with absolute pixel_y positions - use directly
    return createPageFramesFromWasm(paginationResult);
  }, [paginationResult]);

  // Calculate total height for discrete mode (pages + gaps)
  // Uses WASM layout values (single source of truth) with fallbacks
  const discreteTotalHeight = useMemo(() => {
    if (!isDiscreteMode || pageFrames.length === 0) return 0;
    // Get layout values from WASM result, fall back to constants
    const pageHeight = paginationResult?.stats.layout?.page_height_px ?? PAGE_HEIGHT_PX;
    const pageGap = paginationResult?.stats.layout?.page_gap_px ?? PAGE_GAP_PX;
    return pageFrames.length * pageHeight + (pageFrames.length - 1) * pageGap;
  }, [isDiscreteMode, pageFrames, paginationResult]);

  // Handle Script Check button click
  const handleScriptCheck = useCallback(() => {
    if (canUseScriptCheck(userPlan)) {
      setScriptCheckOpen(true);
    } else {
      setUpgradeDialogOpen(true);
    }
  }, [userPlan]);

  // Toggle Find/Replace panel
  const handleToggleFindReplace = useCallback(() => {
    setShowFindReplace(prev => !prev);
    onToggleFindReplace?.();
  }, [onToggleFindReplace]);

  // Get screenplay content for analysis
  const screenplayContent = useMemo(() => {
    if (!view) return '';
    return view.state.doc.textContent;
  }, [view]);

  // Handle clicks on empty areas - place cursor at nearest position
  const handleEmptyAreaClick = useCallback((e: React.MouseEvent) => {
    if (!view) return;

    // Check if click was directly on the container (not on ProseMirror content)
    const target = e.target as HTMLElement;
    if (target.closest('.ProseMirror')) return; // Let ProseMirror handle it

    // Try to find position from coordinates
    const coords = { left: e.clientX, top: e.clientY };
    const pos = view.posAtCoords(coords);

    if (pos) {
      // Found a position - place cursor there
      const { tr } = view.state;
      const selection = TextSelection.near(view.state.doc.resolve(pos.pos));
      view.dispatch(tr.setSelection(selection).scrollIntoView());
    } else {
      // Couldn't find position - go to end of document
      const { tr, doc } = view.state;
      const selection = TextSelection.atEnd(doc);
      view.dispatch(tr.setSelection(selection).scrollIntoView());
    }
    view.focus();
  }, [view]);

  // Notify parent when view is ready
  useEffect(() => {
    if (isReady && view && onViewReady) {
      onViewReady(view);
    }
  }, [isReady, view, onViewReady]);

  // Notify parent when current scene changes
  useEffect(() => {
    if (onCurrentSceneChange) {
      onCurrentSceneChange(currentSceneId);
    }
  }, [currentSceneId, onCurrentSceneChange]);

  // Sync typewriter mode setting with plugin
  useEffect(() => {
    if (view) {
      updateTypewriterScrollSettings(view, { enabled: settings.editor.typewriterMode });
    }
  }, [view, settings.editor.typewriterMode]);

  // Calculate total spreads for dual view
  const totalSpreads = Math.ceil(pageCount / 2);

  // Navigate spreads in dual view
  const goToPrevSpread = useCallback(() => {
    setCurrentSpread((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNextSpread = useCallback(() => {
    setCurrentSpread((prev) => Math.min(totalSpreads - 1, prev + 1));
  }, [totalSpreads]);

  // Shortcut matcher for customizable shortcuts
  const matchesShortcut = useShortcutMatcher();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save shortcut
      if (matchesShortcut(e, 'save')) {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Center current line
      if (matchesShortcut(e, 'centerLine')) {
        e.preventDefault();
        const viewport = document.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (view && viewport) {
          const { from } = view.state.selection;
          const coords = view.coordsAtPos(from);
          const viewportRect = viewport.getBoundingClientRect();
          const scrollTop = viewport.scrollTop;
          const viewportHeight = viewport.clientHeight;

          // Calculate scroll position to center the cursor
          const targetScroll = scrollTop + (coords.top - viewportRect.top) - (viewportHeight / 2);

          viewport.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          });
        }
        return;
      }

      // Find/Replace - Cmd/Ctrl+F
      if (e.key === 'f' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        setShowFindReplace(true);
        return;
      }

    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSave, viewMode, view, goToPrevSpread, goToNextSpread, matchesShortcut]);

  return (
    <div
      className={cn(
        'pm-editor-wrapper',
        viewMode === 'discrete' && 'pm-discrete-mode',
        isInFocusMode && 'pm-focus-mode',
        isReadingMode && 'pm-reading-mode',
        `pm-paper-${paperColor}`,
        !showPlaceholders && 'hide-placeholders',
        className
      )}
    >
      {/* Desktop toolbars - conditional based on layout setting */}
      {isReady && !isMobile && (
        toolbarLayout === 'maelle' ? (
          // Maelle: Unified floating header (Google Docs style) - hidden in reading mode
          effectiveEditable && (
            <EditorUnifiedToolbar
              zoom={scale}
              fitToWidthScale={fitToWidthScale}
              onZoomChange={setZoom}
              onResetZoom={resetZoom}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onToggleFocusMode={toggleFocusMode}
              onTimelapse={onTimelapse}
              onVersionHistory={onToggleVersionHistory}
              scenesCount={scenesCount}
              charactersCount={charactersCount}
              shotlistCount={shotlistCount}
              notesCount={notesCount}
              isInFocusMode={isInFocusMode}
            />
          )
        ) : (
          // Verso: Right-side floating toolbar (Procreate style) - always visible
          <RightToolbar
            zoom={scale}
            fitToWidthScale={fitToWidthScale}
            onZoomChange={setZoom}
            onResetZoom={resetZoom}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            isInFocusMode={isInFocusMode}
            onToggleFocusMode={toggleFocusMode}
            isInReadingMode={isReadingMode}
            onToggleReadingMode={toggleReadingMode}
            isHighlightActive={isHighlightActive}
            highlightColor={highlightColor}
            onHighlightToggle={toggleHighlight}
            onHighlightColorChange={setHighlightColor}
            isEraserActive={isEraserActive}
            onEraserToggle={toggleEraser}
            onScriptCheck={handleScriptCheck}
          />
        )
      )}

      {/* Focus mode exit button - only on mobile when in focus mode */}
      {isMobile && isInFocusMode && (
        <Button
          className="fixed top-4 right-4 z-50 opacity-60 hover:opacity-100 transition-opacity"
          variant="secondary"
          size="icon"
          onClick={toggleFocusMode}
          title="Exit focus mode"
        >
          <X className="h-4 w-4" />
        </Button>
      )}


      {/* Editor container with page styling */}
      <EditorScrollArea
        ref={scrollContainerRef}
        className={cn(
          'pm-editor-scroll-area pm-editor-scroll-container h-full',
          viewMode === 'continuous' && 'pm-continuous-mode'
        )}
      >
        {/* Centered container for frames + content */}
        {/* Uses left: 50% + negative margin to center the SCALED content */}
        <div
          className="relative"
          style={{
            width: `${PAGE_WIDTH_PX}px`,
            // Center the scaled element: left 50% - half of visual width
            left: '50%',
            marginLeft: `${-(PAGE_WIDTH_PX * scale) / 2}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            // In discrete mode, set min-height to match total page frames height
            minHeight: isDiscreteMode && discreteTotalHeight > 0
              ? `${discreteTotalHeight}px`
              : undefined,
          }}
        >
            {/* Page frames layer (discrete mode only) - positioned within this container */}
            {isDiscreteMode && isReady && (
              <PageFrameRenderer
                frames={pageFrames}
                scale={scale}
                discreteMode={isDiscreteMode}
                pageStyle={pageStyle}
                showPageNumbers={settings.interface.showPageNumbers}
                scrollContainerRef={scrollContainerRef}
              />
            )}

            {/* Gap overlays between pages (discrete mode only) */}
            {isDiscreteMode && isReady && (
              <PageGapRenderer
                frames={pageFrames}
                scale={scale}
                discreteMode={isDiscreteMode}
                scrollContainerRef={scrollContainerRef}
              />
            )}

            {/* Content layer */}
            <EditorContextMenu view={view} onFindReplace={handleToggleFindReplace}>
              <div
                className={cn(
                  'pm-editor-pages',
                  isDiscreteMode && 'pm-content-layer'
                )}
                onClick={handleEmptyAreaClick}
              >
                {/* ProseMirror mounts here */}
                <div
                  ref={containerRef}
                  className={cn(
                    'pm-editor-page',
                    !isReady && 'opacity-0',
                    'transition-opacity duration-200'
                  )}
                  data-page-style={pageStyle}
                />
              </div>
            </EditorContextMenu>
        </div>
      </EditorScrollArea>

      {/* Find/Replace panel */}
      <FindReplacePanel
        view={view}
        isOpen={showFindReplace}
        onClose={() => setShowFindReplace(false)}
        scrollViewportRef={scrollContainerRef}
        scale={scale}
      />

      {/* Element type toolbar (expandable indicator) - hidden in reading mode and during find/replace */}
      {showElementIndicator && isReady && !isReadingMode && !showFindReplace && (
        <ElementToolbar
          view={view}
          currentElementType={currentElementType}
        />
      )}

      {/* Stats bar - hidden on mobile and in reading mode */}
      {showStats && settings.interface.showStatsBar && isReady && !isMobile && !isReadingMode && (
        <StatsBar
          wordCount={wordCount}
          pageCount={pageCount}
          sceneCount={scenes?.length ?? 0}
          characterCount={characters?.length ?? 0}
          isSaving={isSaving}
        />
      )}

      {/* Floating toolbar on selection - hidden in read-only/reading mode */}
      {isReady && effectiveEditable && <FloatingToolbar view={view} scrollbarWidth={EDITOR_SCROLLBAR_WIDTH} />}

      {/* Autocomplete dropdown */}
      {isReady && autocompleteState && (
        <AutocompleteDropdown
          view={view}
          state={autocompleteState}
          onSelect={applyAutocompleteSuggestion}
        />
      )}

      {/* Mobile editor toolbar - disabled, using EditorBottomNav instead */}
      {false && isMobile && isReady && effectiveEditable && (
        <MobileEditorToolbar
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onInsertSceneHeading={() => handleInsertElement('scene_heading')}
          onInsertCharacter={() => handleInsertElement('character')}
          onInsertDialogue={() => handleInsertElement('dialogue')}
          onInsertAction={() => handleInsertElement('action')}
          onInsertShot={() => handleInsertElement('shot')}
          onInsertTransition={() => handleInsertElement('transition')}
          onInsertParenthetical={() => handleInsertElement('parenthetical')}
          onInsertDualDialogue={() => handleInsertElement('dual_dialogue')}
          onBold={handleBold}
          onItalic={handleItalic}
          onUnderline={handleUnderline}
          onAutoFormat={() => {}}
          onSave={() => onSave?.()}
          onToggleFindReplace={handleToggleFindReplace}
          onToggleSceneNavigator={() => setScenesSheetOpen(true)}
          onToggleVersionHistory={onToggleVersionHistory}
          onToggleZenMode={toggleFocusMode}
          onExportPDF={() => onExportPDF?.()}
          onOpenScenes={() => setScenesSheetOpen(true)}
          onToggleLineNumbers={() => onToggleLineNumbers?.()}
          onTogglePageBreaks={() => onTogglePageBreaks?.()}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          showLineNumbers={showLineNumbers}
          showPageBreaks={showPageBreaks}
          zoom={Math.round(scale * 100)}
          wordCount={wordCount}
          pageCount={pageCount}
          isSaving={isSaving}
        />
      )}

      {/* Mobile scenes/characters sheet */}
      {isMobile && (
        <MobileSceneCharacterSheet
          open={scenesSheetOpen}
          onOpenChange={setScenesSheetOpen}
          scenes={scenes}
          characters={characters}
          view={view}
          currentSceneId={currentSceneId}
        />
      )}

      {/* Mobile zoom indicator - Procreate-style slider */}
      {isMobile && (
        <ZoomIndicator
          zoom={scale}
          fitToWidthScale={fitToWidthScale}
          onZoomChange={setZoom}
          onResetZoom={resetZoom}
          className="bottom-20 right-4"
        />
      )}

      {/* Beginner tips - contextual writing guidance */}
      {showBeginnerTips && isReady && !isMobile && effectiveEditable && (
        <BeginnerTips currentElementType={currentElementType} />
      )}

      {/* Typing test panel - dev mode only (Ctrl+Shift+T) */}
      {process.env.NODE_ENV === 'development' && isReady && (
        <TypingTestPanel view={view} />
      )}

      {/* Script Check dialog */}
      <VersoAnalysis
        isOpen={scriptCheckOpen}
        screenplay={screenplayContent}
        onClose={() => setScriptCheckOpen(false)}
      />

      {/* Upgrade dialog for non-Pro users */}
      <UpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
      />

    </div>
  );
}
