'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, Maximize2, Scroll, FileText, X } from 'lucide-react';
import {
  useProseMirrorEditor,
  SceneInfo,
  CharacterInfo,
} from '@/hooks/editor/useProseMirrorEditor';
import { useResponsiveScale } from '@/hooks/editor/useResponsiveScale';
import { useIsMobile } from '@/hooks/use-mobile';
import { PAGE_WIDTH_PX, PAGE_HEIGHT_PX } from '@/lib/constants';
import { FloatingToolbar } from './FloatingToolbar';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { ElementToolbar } from './ElementToolbar';
import { EditorScrollArea, EDITOR_SCROLLBAR_WIDTH } from './EditorScrollArea';
import { PageFrameRenderer, PageGapRenderer } from './PageFrameRenderer';
import { createPageFramesFromWasm, PAGE_GAP_PX } from '@/lib/prosemirror/plugins/page-frames';
import { applyLayoutCSS, applyLayoutMetadataCSS, DEFAULT_FEATURE_FILM_CONFIG } from '@/lib/verso';
import { Button } from '@/components/ui/button';
import { MobileEditorToolbar } from '@/components/mobile-editor-toolbar';
import { MobileSceneCharacterSheet } from '@/components/editor/MobileSceneCharacterSheet';
import { ScreenplayStatsMobile } from '@/components/screenplay-stats-mobile';
import { setElementType } from '@/lib/prosemirror/plugins/element-switching';
import { toggleBold, toggleItalic, toggleUnderline } from '@/lib/prosemirror/plugins/keymap';
import { useShortcutMatcher } from '@/lib/shortcuts/use-shortcut';
import '@/styles/editor/prosemirror.css';

export type ViewMode = 'discrete' | 'continuous';

export interface ProseMirrorEditorProps {
  content: string | null;
  onContentChange?: (content: string) => void;
  onScenesChange?: (scenes: SceneInfo[], characters: CharacterInfo[]) => void;
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
}: ProseMirrorEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_currentSpread, setCurrentSpread] = useState(0);
  const [isInFocusMode, setIsInFocusMode] = useState(false);
  const [scenesSheetOpen, setScenesSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  // Responsive scaling - pages are fixed size and scaled with CSS transforms
  const { scale } = useResponsiveScale(!isInFocusMode);

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
    paginationResult,
  } = useProseMirrorEditor({
    initialContent: content,
    onUpdate: onContentChange,
    onScenesChange,
    editable,
  });

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
      {/* View mode switcher - ghost buttons, hidden in focus mode and on mobile */}
      {isReady && !isInFocusMode && !isMobile && (
        <div className="fixed top-20 right-4 z-40 flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('discrete')}
            title="Discrete page view"
            className={cn(
              'h-8 w-8 text-muted-foreground/40 hover:text-foreground hover:bg-accent/50',
              viewMode === 'discrete' && 'text-foreground bg-accent/50'
            )}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('continuous')}
            title="Continuous scroll view"
            className={cn(
              'h-8 w-8 text-muted-foreground/40 hover:text-foreground hover:bg-accent/50',
              viewMode === 'continuous' && 'text-foreground bg-accent/50'
            )}
          >
            <Scroll className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFocusMode}
            title="Focus mode (Cmd+Shift+F)"
            className="h-8 w-8 text-muted-foreground/40 hover:text-foreground hover:bg-accent/50"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
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

      {/* Mobile stats bar - only visible on mobile */}
      {isMobile && isReady && (
        <ScreenplayStatsMobile
          wordCount={wordCount}
          pageCount={pageCount}
          sceneCount={scenes?.length ?? 0}
          characterCount={characters?.length ?? 0}
          onOpenScenes={() => setScenesSheetOpen(true)}
        />
      )}

      {/* Editor container with page styling */}
      <EditorScrollArea
        className={cn(
          'pm-editor-scroll-area h-full',
          viewMode === 'continuous' && 'pm-continuous-mode'
        )}
      >
        {/* Page frames layer (discrete mode only) - rendered behind content */}
        {isDiscreteMode && isReady && (
          <PageFrameRenderer
            frames={pageFrames}
            scale={scale}
            discreteMode={isDiscreteMode}
          />
        )}

        {/* Gap overlays between pages (discrete mode only) */}
        {isDiscreteMode && isReady && (
          <PageGapRenderer
            frames={pageFrames}
            scale={scale}
            discreteMode={isDiscreteMode}
          />
        )}

        <div
          className={cn(
            'pm-editor-pages',
            isDiscreteMode && 'pm-content-layer'
          )}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
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
          />
        </div>
      </EditorScrollArea>

      {/* Element type toolbar (expandable indicator) */}
      {showElementIndicator && isReady && (
        <ElementToolbar
          view={view}
          currentElementType={currentElementType}
        />
      )}

      {/* Stats bar - hidden on mobile */}
      {showStats && isReady && !isMobile && (
        <StatsBar
          wordCount={wordCount}
          pageCount={pageCount}
          sceneCount={scenes?.length ?? 0}
          characterCount={characters?.length ?? 0}
          isSaving={isSaving}
        />
      )}

      {/* Floating toolbar on selection */}
      {isReady && <FloatingToolbar view={view} scrollbarWidth={EDITOR_SCROLLBAR_WIDTH} />}

      {/* Autocomplete dropdown */}
      {isReady && autocompleteState && (
        <AutocompleteDropdown
          view={view}
          state={autocompleteState}
          onSelect={applyAutocompleteSuggestion}
        />
      )}

      {/* Mobile editor toolbar */}
      {isMobile && isReady && (
        <MobileEditorToolbar
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onInsertSceneHeading={() => handleInsertElement('scene_heading')}
          onInsertCharacter={() => handleInsertElement('character')}
          onInsertDialogue={() => handleInsertElement('dialogue')}
          onInsertAction={() => handleInsertElement('action')}
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
          onZoomIn={() => {}}
          onZoomOut={() => {}}
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
        />
      )}
    </div>
  );
}

export default ProseMirrorEditor;
