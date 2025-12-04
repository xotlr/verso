'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, ChevronLeft, ChevronRight, Maximize2, BookOpen, FileText, Scroll } from 'lucide-react';
import {
  useProseMirrorEditor,
  SceneInfo,
  CharacterInfo,
} from '@/hooks/editor/useProseMirrorEditor';
import { useResponsiveScale } from '@/hooks/editor/useResponsiveScale';
import { PAGE_WIDTH_PX } from '@/lib/constants';
import { FloatingToolbar } from './FloatingToolbar';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { ElementToolbar } from './ElementToolbar';
import { EDITOR_SCROLLBAR_WIDTH } from './EditorScrollArea';
import { Button } from '@/components/ui/button';
import '@/styles/editor/prosemirror.css';

export type ViewMode = 'single' | 'dual' | 'continuous';

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
}

/**
 * Stats bar showing word count, page count, and save status.
 */
function StatsBar({
  wordCount,
  pageCount,
  isSaving,
  isWasmReady,
  className,
}: {
  wordCount: number;
  pageCount: number;
  isSaving?: boolean;
  isWasmReady?: boolean;
  className?: string;
}) {
  const isDev = process.env.NODE_ENV === 'development';
  const [showWasmDebug, setShowWasmDebug] = useState(false);

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
      {/* WASM status - dev only, toggleable */}
      {isDev && showWasmDebug && (
        <>
          <button
            onClick={() => setShowWasmDebug(false)}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer',
              isWasmReady
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
            )}
            title="Click to hide WASM status"
          >
            {isWasmReady ? 'WASM' : 'JS'}
          </button>
          <span className="text-border">|</span>
        </>
      )}
      {isDev && !showWasmDebug && (
        <>
          <button
            onClick={() => setShowWasmDebug(true)}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground cursor-pointer"
            title="Click to show WASM status"
          >
            ⚙
          </button>
          <span className="text-border">|</span>
        </>
      )}
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
}: ProseMirrorEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isInFocusMode, setIsInFocusMode] = useState(false);

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
    view,
    autocompleteState,
    applyAutocompleteSuggestion,
  } = useProseMirrorEditor({
    initialContent: content,
    onUpdate: onContentChange,
    onScenesChange,
    editable,
  });

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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+S for save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Shift+Ctrl+E - Center current line
      if (e.shiftKey && e.ctrlKey && e.key === 'e') {
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

      // Arrow keys for spread navigation in dual view
      if (viewMode === 'dual' && !e.metaKey && !e.ctrlKey) {
        if (e.key === 'ArrowLeft' && e.altKey) {
          e.preventDefault();
          goToPrevSpread();
        } else if (e.key === 'ArrowRight' && e.altKey) {
          e.preventDefault();
          goToNextSpread();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSave, viewMode, view, goToPrevSpread, goToNextSpread]);

  return (
    <div
      className={cn(
        'pm-editor-wrapper',
        viewMode === 'dual' && 'pm-dual-mode',
        isInFocusMode && 'pm-focus-mode',
        className
      )}
    >
      {/* View mode switcher - hidden in focus mode */}
      {isReady && !isInFocusMode && (
        <div className="pm-view-switcher hover:opacity-90 transition-opacity duration-200">
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

      {/* Editor container with page styling */}
      <div
        className={cn(
          'pm-editor-scroll-area h-full',
          viewMode === 'continuous' && 'pm-continuous-mode'
        )}
      >
        <div
          className={cn(
            'pm-editor-pages',
            viewMode === 'dual' && 'pm-dual-view'
          )}
          style={{
            transform: viewMode === 'dual'
              ? `translateX(-${currentSpread * 100}%) scale(${scale})`
              : `scale(${scale})`,
            transformOrigin: 'top center',
            width: `${PAGE_WIDTH_PX}px`,
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
      </div>

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

      {/* Stats bar */}
      {showStats && isReady && (
        <StatsBar wordCount={wordCount} pageCount={pageCount} isSaving={isSaving} isWasmReady={isWasmReady} />
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
    </div>
  );
}

export default ProseMirrorEditor;
