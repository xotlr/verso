'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, X } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { PAGE_WIDTH_PX, PAGE_HEIGHT_PX } from '@/lib/constants';
import { FloatingToolbar } from './FloatingToolbar';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { EditorContextMenu } from './EditorContextMenu';
import { ElementToolbar } from './ElementToolbar';
import { LeftToolbar } from '@/components/editor/LeftToolbar';
import { RightToolbar } from '@/components/editor/RightToolbar';
import { EditorUnifiedToolbar } from '@/components/editor/EditorUnifiedToolbar';
import { EditorScrollArea, EDITOR_SCROLLBAR_WIDTH } from './EditorScrollArea';
import { PageFrameRenderer, PageGapRenderer } from './PageFrameRenderer';
import { createPageFramesFromWasm, PAGE_GAP_PX } from '@/lib/prosemirror/plugins/page-frames';
import { applyLayoutCSS, applyLayoutMetadataCSS, DEFAULT_FEATURE_FILM_CONFIG, type PaginationResult } from '@/lib/verso';
import { Button } from '@/components/ui/button';
import { MobileEditorToolbar } from '@/components/editor/mobile-editor-toolbar';
import { MobileSceneCharacterSheet } from '@/components/editor/MobileSceneCharacterSheet';
import { setElementType } from '@/lib/prosemirror/plugins/element-switching';
import { toggleBold, toggleItalic, toggleUnderline } from '@/lib/prosemirror/plugins/keymap';
import { updateTypewriterScrollSettings } from '@/lib/prosemirror/plugins';
import { useShortcutMatcher } from '@/lib/shortcuts/use-shortcut';
import { useSettings } from '@/contexts/settings-context';
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
}

/**
 * Minimal stats bar - shows save status + page count, expands on hover for more stats.
 */
function StatsBar({
  wordCount,
  pageCount,
  sceneCount,
  characterCount,
  isSaving,
  className,
}: {
  wordCount: number;
  pageCount: number;
  sceneCount: number;
  characterCount: number;
  isSaving?: boolean;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn('fixed bottom-4 right-4 z-40', className)}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Expanded stats - appears above on hover */}
      {isExpanded && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg bg-popover/95 backdrop-blur-sm border border-border/50 text-xs text-muted-foreground shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150">
          <div className="flex items-center gap-3">
            <span>{wordCount.toLocaleString()} words</span>
            <span className="text-border">·</span>
            <span>{sceneCount} scenes</span>
            <span className="text-border">·</span>
            <span>{characterCount} characters</span>
          </div>
        </div>
      )}

      {/* Collapsed stats - always visible */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/50 backdrop-blur-sm border border-border/30 text-xs text-muted-foreground/70 hover:text-muted-foreground hover:bg-card/70 transition-colors cursor-default">
        {/* Save status */}
        {isSaving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3 text-green-500/70" />
        )}
        <span className="text-border/50">·</span>
        <span>
          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
        </span>
      </div>
    </div>
  );
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
}: ProseMirrorEditorProps) {
  const { settings } = useSettings();
  // Read scroll mode directly from settings
  // In timelapse mode, always use discrete to show page frames
  const viewMode = timelapseMode ? 'discrete' : (settings.editor.scrollMode ?? defaultViewMode);
  // Toolbar layout: 'verso' (separate floating) or 'inverso' (unified header)
  const toolbarLayout = settings.layout.toolbarLayout ?? 'verso';
  // Page style: 'themed' uses theme colors, 'plain' uses off-white
  const pageStyle = settings.editor.pageStyle ?? 'themed';
  // Show scene numbers even when document has title page
  const showSceneNumbers = settings.editor.showSceneNumbers ?? false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_currentSpread, setCurrentSpread] = useState(0);
  const [isInFocusMode, setIsInFocusMode] = useState(false);
  const [scenesSheetOpen, setScenesSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  // Ref for scroll container (for zoom gestures)
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Apply layout CSS from WASM config on mount
  // This sets initial CSS variables from the config
  useEffect(() => {
    applyLayoutCSS(DEFAULT_FEATURE_FILM_CONFIG);
  }, []);

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
  } = useProseMirrorEditor({
    initialContent: content,
    onUpdate: onContentChange,
    onScenesChange,
    editable,
    showSceneNumbers,
    timelapseMode,
    // Yjs CRDT collaboration options
    yXmlFragment,
    awareness,
    yjsUserInfo,
  });

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

  // Check if in discrete mode
  const isDiscreteMode = viewMode === 'discrete';

  // Calculate total height for discrete mode (pages + gaps)
  // Uses WASM layout values (single source of truth) with fallbacks
  const discreteTotalHeight = useMemo(() => {
    if (!isDiscreteMode || pageFrames.length === 0) return 0;
    // Get layout values from WASM result, fall back to constants
    const pageHeight = paginationResult?.stats.layout?.page_height_px ?? PAGE_HEIGHT_PX;
    const pageGap = paginationResult?.stats.layout?.page_gap_px ?? PAGE_GAP_PX;
    return pageFrames.length * pageHeight + (pageFrames.length - 1) * pageGap;
  }, [isDiscreteMode, pageFrames, paginationResult]);

  // Mobile toolbar callbacks
  const handleInsertElement = useCallback((elementType: string) => {
    if (!view) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setElementType(elementType as any)(view.state, view.dispatch);
    view.focus();
  }, [view]);

  const handleBold = useCallback(() => {
    if (!view) return;
    toggleBold(view.state, view.dispatch);
    view.focus();
  }, [view]);

  const handleItalic = useCallback(() => {
    if (!view) return;
    toggleItalic(view.state, view.dispatch);
    view.focus();
  }, [view]);

  const handleUnderline = useCallback(() => {
    if (!view) return;
    toggleUnderline(view.state, view.dispatch);
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
        className
      )}
    >
      {/* Desktop toolbars - conditional based on layout setting, hidden in read-only mode */}
      {isReady && !isMobile && editable && (
        toolbarLayout === 'maelle' ? (
          // Maelle: Unified floating header (Google Docs style)
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
        ) : (
          // Verso: Separate floating toolbars (Procreate style)
          <>
            <RightToolbar
              onToggleFocusMode={toggleFocusMode}
              isInFocusMode={isInFocusMode}
            />
            <LeftToolbar
              zoom={scale}
              fitToWidthScale={fitToWidthScale}
              onZoomChange={setZoom}
              onResetZoom={resetZoom}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              isInFocusMode={isInFocusMode}
            />
          </>
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
        {/* Page frames layer (discrete mode only) - rendered behind content */}
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

        <EditorContextMenu view={view} onFindReplace={onToggleFindReplace}>
          <div
            className={cn(
              'pm-editor-pages',
              isDiscreteMode && 'pm-content-layer'
            )}
            style={{
              transform: `translateX(-50%) scale(var(--editor-zoom, ${scale}))`,
              transformOrigin: 'top center',
              position: 'relative',
              left: '50%',
              width: `${PAGE_WIDTH_PX}px`,
              // In discrete mode, set min-height to match total page frames height
              minHeight: isDiscreteMode && discreteTotalHeight > 0
                ? `${discreteTotalHeight}px`
                : undefined,
            }}
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
      </EditorScrollArea>

      {/* Element type toolbar (expandable indicator) */}
      {showElementIndicator && isReady && (
        <ElementToolbar
          view={view}
          currentElementType={currentElementType}
        />
      )}

      {/* Stats bar - hidden on mobile */}
      {showStats && settings.interface.showStatsBar && isReady && !isMobile && (
        <StatsBar
          wordCount={wordCount}
          pageCount={pageCount}
          sceneCount={scenes?.length ?? 0}
          characterCount={characters?.length ?? 0}
          isSaving={isSaving}
        />
      )}

      {/* Floating toolbar on selection - hidden in read-only mode */}
      {isReady && editable && <FloatingToolbar view={view} scrollbarWidth={EDITOR_SCROLLBAR_WIDTH} />}

      {/* Autocomplete dropdown */}
      {isReady && autocompleteState && (
        <AutocompleteDropdown
          view={view}
          state={autocompleteState}
          onSelect={applyAutocompleteSuggestion}
        />
      )}

      {/* Mobile editor toolbar - disabled, using EditorBottomNav instead */}
      {false && isMobile && isReady && editable && (
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
          onToggleFindReplace={() => onToggleFindReplace?.()}
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

    </div>
  );
}
