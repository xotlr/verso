'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, ChevronLeft, ChevronRight, Maximize2, BookOpen, FileText, Scroll } from 'lucide-react';
import {
  useProseMirrorEditor,
  SceneInfo,
  CharacterInfo,
} from '@/hooks/editor/useProseMirrorEditor';
import { ELEMENT_DISPLAY_NAMES, ElementType } from '@/lib/prosemirror';
import { FloatingToolbar } from './FloatingToolbar';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { EditorScrollArea, EDITOR_SCROLLBAR_WIDTH } from './EditorScrollArea';
import { Button } from '@/components/ui/button';
import '@/styles/editor/prosemirror.css';

export type ViewMode = 'single' | 'dual' | 'continuous';

export interface ProseMirrorEditorProps {
  content: string | null;
  onContentChange?: (content: string) => void;
  onScenesChange?: (scenes: SceneInfo[], characters: CharacterInfo[]) => void;
  onSave?: () => void;
  editable?: boolean;
  className?: string;
  showElementIndicator?: boolean;
  showStats?: boolean;
  isSaving?: boolean;
  defaultViewMode?: ViewMode;
}

/**
 * Element type indicator pill that shows current element type.
 */
function ElementIndicator({
  elementType,
  className,
}: {
  elementType: ElementType;
  className?: string;
}) {
  const displayName = ELEMENT_DISPLAY_NAMES[elementType] || 'Unknown';

  // Color coding by element type
  const colorClasses: Record<ElementType, string> = {
    scene_heading: 'text-blue-500 border-blue-500/30',
    action: 'text-muted-foreground border-border',
    character: 'text-purple-500 border-purple-500/30',
    dialogue: 'text-foreground/80 border-border',
    parenthetical: 'text-muted-foreground border-border',
    transition: 'text-orange-500 border-orange-500/30',
    dual_dialogue: 'text-violet-500 border-violet-500/30',
  };

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
        'px-4 py-1.5 rounded-full',
        'bg-card/95 backdrop-blur-sm border',
        'text-xs font-medium uppercase tracking-wider',
        'shadow-md',
        'transition-all duration-200 ease-out',
        colorClasses[elementType],
        className
      )}
      data-type={elementType}
    >
      {displayName}
    </div>
  );
}

/**
 * Stats bar showing word count, page count, and save status.
 */
function StatsBar({
  wordCount,
  pageCount,
  isSaving,
  className,
}: {
  wordCount: number;
  pageCount: number;
  isSaving?: boolean;
  className?: string;
}) {
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
  const [indicatorVisible, setIndicatorVisible] = useState(true);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

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
    view,
    autocompleteState,
    applyAutocompleteSuggestion,
  } = useProseMirrorEditor({
    initialContent: content,
    onUpdate: onContentChange,
    onScenesChange,
    editable,
  });

  // Calculate total spreads for dual view
  const totalSpreads = Math.ceil(pageCount / 2);

  // Auto-hide element indicator after 2s of inactivity
  useEffect(() => {
    setIndicatorVisible(true);
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
    }
    indicatorTimeoutRef.current = setTimeout(() => {
      setIndicatorVisible(false);
    }, 2000);

    return () => {
      if (indicatorTimeoutRef.current) {
        clearTimeout(indicatorTimeoutRef.current);
      }
    };
  }, [currentElementType]);

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
        if (view && scrollViewportRef.current) {
          const { from } = view.state.selection;
          const coords = view.coordsAtPos(from);
          const viewport = scrollViewportRef.current;
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
      <EditorScrollArea
        ref={scrollViewportRef}
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
          style={
            viewMode === 'dual'
              ? { transform: `translateX(-${currentSpread * 100}%)` }
              : undefined
          }
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

      {/* Element type indicator */}
      {showElementIndicator && isReady && (
        <ElementIndicator
          elementType={currentElementType}
          className={cn(
            'transition-opacity duration-300',
            indicatorVisible ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Stats bar */}
      {showStats && isReady && (
        <StatsBar wordCount={wordCount} pageCount={pageCount} isSaving={isSaving} />
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
