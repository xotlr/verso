'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, ChevronLeft, ChevronRight, Maximize2, BookOpen, FileText, Scroll, LayoutGrid, X } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { MobileEditorToolbar } from '@/components/mobile-editor-toolbar';
import { MobileSceneCharacterSheet } from '@/components/editor/MobileSceneCharacterSheet';
import { ScreenplayStatsMobile } from '@/components/screenplay-stats-mobile';
import { setElementType } from '@/lib/prosemirror/plugins/element-switching';
import { toggleBold, toggleItalic, toggleUnderline } from '@/lib/prosemirror/plugins/keymap';
import { useShortcutMatcher } from '@/lib/shortcuts/use-shortcut';
import '@/styles/editor/prosemirror.css';

export type ViewMode = 'single' | 'dual' | 'continuous' | 'discrete';

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
 * Stats bar showing word count, page count, save status, and WASM engine status.
 */
function StatsBar({
  wordCount,
  pageCount,
  isSaving,
  isWasmReady,
  paginationTiming,
  paginationError,
  className,
}: {
  wordCount: number;
  pageCount: number;
  isSaving?: boolean;
  isWasmReady?: boolean;
  paginationTiming?: number | null;
  paginationError?: Error | null;
  className?: string;
}) {
  // Determine engine status
  const engineStatus = paginationError
    ? 'error'
    : isWasmReady
      ? 'ready'
      : 'loading';

  const statusConfig = {
    ready: {
      bgClass: 'bg-green-500/20',
      textClass: 'text-green-400',
      dotClass: 'bg-green-400',
      label: 'Engine',
      tooltip: paginationTiming
        ? `Pagination: ${paginationTiming.toFixed(0)}ms`
        : 'WASM engine ready',
    },
    loading: {
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-400',
      dotClass: 'bg-yellow-400 animate-pulse',
      label: 'Loading',
      tooltip: 'Initializing WASM engine...',
    },
    error: {
      bgClass: 'bg-red-500/20',
      textClass: 'text-red-400',
      dotClass: 'bg-red-400',
      label: 'Error',
      tooltip: paginationError?.message || 'WASM engine failed to load',
    },
  };

  const config = statusConfig[engineStatus];

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-40',
        'flex items-center gap-4',
        'px-4 py-1.5 rounded-full',
        'bg-card/70 backdrop-blur-sm border border-border/50',
        'text-xs text-muted-foreground/80',
        'shadow-md',
        className
      )}
    >
      {/* WASM Engine Status - always visible */}
      <span
        className={cn(
          'flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium',
          config.bgClass,
          config.textClass
        )}
        title={config.tooltip}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', config.dotClass)} />
        {config.label}
      </span>
      <span className="text-border">|</span>
      {/* Save status */}
      <span className="flex items-center gap-1.5">
        {isSaving ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <Check className="h-3 w-3 text-green-500" />
            <span>Saved</span>
          </>
        )}
      </span>
      <span className="text-border">|</span>
      <span>{wordCount.toLocaleString()} words</span>
      <span className="text-border">|</span>
      <span>
        {pageCount} {pageCount === 1 ? 'page' : 'pages'}
      </span>
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
  defaultViewMode = 'single',
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
  const [currentSpread, setCurrentSpread] = useState(0);
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

  const {
    containerRef,
    currentElementType,
    wordCount,
    pageCount,
    isReady,
    isWasmReady,
    paginationTiming,
    paginationError,
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

  // Create page frames from WASM pagination result
  const pageFrames = useMemo(() => {
    if (!paginationResult) return [];
    return createPageFramesFromWasm(paginationResult);
  }, [paginationResult]);

  // Check if in discrete mode
  const isDiscreteMode = viewMode === 'discrete';

  // Calculate total height for discrete mode (pages + gaps)
  const discreteTotalHeight = useMemo(() => {
    if (!isDiscreteMode || pageFrames.length === 0) return 0;
    return pageFrames.length * PAGE_HEIGHT_PX + (pageFrames.length - 1) * PAGE_GAP_PX;
  }, [isDiscreteMode, pageFrames]);

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

      // Spread navigation in dual view
      if (viewMode === 'dual') {
        if (matchesShortcut(e, 'prevSpread')) {
          e.preventDefault();
          goToPrevSpread();
        } else if (matchesShortcut(e, 'nextSpread')) {
          e.preventDefault();
          goToNextSpread();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSave, viewMode, view, goToPrevSpread, goToNextSpread, matchesShortcut]);

  return (
    <div
      className={cn(
        'pm-editor-wrapper',
        viewMode === 'dual' && 'pm-dual-mode',
        viewMode === 'discrete' && 'pm-discrete-mode',
        isInFocusMode && 'pm-focus-mode',
        className
      )}
    >
      {/* View mode switcher - hidden in focus mode and on mobile */}
      {isReady && !isInFocusMode && !isMobile && (
        <div className="pm-view-switcher hover:opacity-90 transition-opacity duration-200">
          <Button
            variant={viewMode === 'discrete' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('discrete')}
            title="Discrete page view (Final Draft style)"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'single' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('single')}
            title="Single page view"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'dual' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('dual')}
            title="Dual page (book) view"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'continuous' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('continuous')}
            title="Continuous scroll view"
          >
            <Scroll className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFocusMode}
            title="Focus mode (Cmd+Shift+F)"
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
            viewMode === 'dual' && 'pm-dual-view',
            isDiscreteMode && 'pm-content-layer'
          )}
          style={{
            transform: viewMode === 'dual'
              ? `translateX(-${currentSpread * 100}%) scale(${scale})`
              : `scale(${scale})`,
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

      {/* Dual view page navigation */}
      {viewMode === 'dual' && isReady && totalSpreads > 1 && (
        <div className="pm-page-nav">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevSpread}
            disabled={currentSpread === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {currentSpread * 2 + 1}-{Math.min(currentSpread * 2 + 2, pageCount)} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextSpread}
            disabled={currentSpread >= totalSpreads - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Element type toolbar (expandable indicator) */}
      {showElementIndicator && isReady && (
        <ElementToolbar
          view={view}
          currentElementType={currentElementType}
        />
      )}

      {/* Stats bar - hidden on mobile */}
      {showStats && isReady && !isMobile && (
        <StatsBar wordCount={wordCount} pageCount={pageCount} isSaving={isSaving} isWasmReady={isWasmReady} paginationTiming={paginationTiming} paginationError={paginationError} />
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
