'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';
import { X, ChevronUp, ChevronDown, Replace, ReplaceAll } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { searchHighlightKey } from '@/lib/prosemirror/plugins';

interface FindReplacePanelProps {
  view: EditorView | null;
  isOpen: boolean;
  onClose: () => void;
  scrollViewportRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
}

interface SearchMatch {
  from: number;
  to: number;
}

export function FindReplacePanel({ view, isOpen, onClose, scrollViewportRef, scale }: FindReplacePanelProps) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Use refs to avoid stale closure issues in callbacks
  const matchesRef = useRef<SearchMatch[]>([]);
  const currentIndexRef = useRef(-1);

  // Keep refs in sync with state
  matchesRef.current = matches;
  currentIndexRef.current = currentMatchIndex;

  // Update decorations when matches or current index changes
  useEffect(() => {
    if (!view || !isOpen) return;

    const decorations: Decoration[] = matches.map((match, index) => {
      const isCurrent = index === currentMatchIndex;
      return Decoration.inline(match.from, match.to, {
        class: isCurrent ? 'search-highlight-current' : 'search-highlight',
      });
    });

    const decorationSet = DecorationSet.create(view.state.doc, decorations);
    const tr = view.state.tr.setMeta(searchHighlightKey, decorationSet);
    view.dispatch(tr);
  }, [view, matches, currentMatchIndex, isOpen]);

  // Clear decorations when panel closes
  useEffect(() => {
    if (!view || isOpen) return;

    // Clear decorations
    const tr = view.state.tr.setMeta(searchHighlightKey, DecorationSet.empty);
    view.dispatch(tr);

    // Reset search state
    setSearchText('');
    setMatches([]);
    setCurrentMatchIndex(-1);
  }, [view, isOpen]);

  // Find all matches in the document
  const findMatches = useCallback((search: string): SearchMatch[] => {
    if (!view || !search) return [];

    const results: SearchMatch[] = [];
    const doc = view.state.doc;
    const searchLower = caseSensitive ? search : search.toLowerCase();

    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const text = caseSensitive ? node.text : node.text.toLowerCase();
        let index = 0;
        while ((index = text.indexOf(searchLower, index)) !== -1) {
          results.push({
            from: pos + index,
            to: pos + index + search.length,
          });
          index += 1;
        }
      }
    });

    return results;
  }, [view, caseSensitive]);

  // Update matches when search text changes
  useEffect(() => {
    const newMatches = findMatches(searchText);
    setMatches(newMatches);

    if (newMatches.length > 0) {
      setCurrentMatchIndex(0);
      // Navigate to first match
      if (view) {
        const match = newMatches[0];
        const tr = view.state.tr.setSelection(
          TextSelection.create(view.state.doc, match.from, match.to)
        );
        view.dispatch(tr);

        // Scroll to match using direct ref
        const viewport = scrollViewportRef.current;
        if (viewport) {
          const coords = view.coordsAtPos(match.from);
          const viewportRect = viewport.getBoundingClientRect();
          const targetScroll = viewport.scrollTop + (coords.top - viewportRect.top) - (viewport.clientHeight / 2);
          viewport.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'auto',
          });
        }
      }
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [searchText, findMatches, view, scrollViewportRef]);

  // Navigate to a specific match (uses refs for latest values)
  const goToMatch = useCallback((index: number) => {
    const currentMatches = matchesRef.current;

    if (!view || currentMatches.length === 0 || index < 0 || index >= currentMatches.length) {
      return;
    }

    const match = currentMatches[index];
    const { state, dispatch } = view;

    // Create selection at match
    const tr = state.tr.setSelection(TextSelection.create(state.doc, match.from, match.to));
    dispatch(tr);
    setCurrentMatchIndex(index);

    // Scroll match into view using direct viewport ref
    const viewport = scrollViewportRef.current;
    if (viewport) {
      const coords = view.coordsAtPos(match.from);
      const viewportRect = viewport.getBoundingClientRect();
      const targetY = viewport.scrollTop + (coords.top - viewportRect.top) - (viewport.clientHeight / 2);
      viewport.scrollTo({
        top: Math.max(0, targetY),
        behavior: 'auto',
      });
    }
  }, [view, scrollViewportRef]);

  // Find next match
  const findNext = useCallback(() => {
    const currentMatches = matchesRef.current;
    const currentIdx = currentIndexRef.current;
    if (currentMatches.length === 0) return;
    const nextIndex = (currentIdx + 1) % currentMatches.length;
    goToMatch(nextIndex);
  }, [goToMatch]);

  // Find previous match
  const findPrevious = useCallback(() => {
    const currentMatches = matchesRef.current;
    const currentIdx = currentIndexRef.current;
    if (currentMatches.length === 0) return;
    const prevIndex = currentIdx <= 0 ? currentMatches.length - 1 : currentIdx - 1;
    goToMatch(prevIndex);
  }, [goToMatch]);

  // Replace current match
  const replaceCurrent = useCallback(() => {
    const currentMatches = matchesRef.current;
    const currentIdx = currentIndexRef.current;
    if (!view || currentIdx < 0 || currentIdx >= currentMatches.length) return;

    const match = currentMatches[currentIdx];
    const { state, dispatch } = view;

    const tr = state.tr.replaceWith(
      match.from,
      match.to,
      replaceText ? state.schema.text(replaceText) : state.schema.text('')
    );
    dispatch(tr);

    // Re-search and move to next
    setTimeout(() => {
      const newMatches = findMatches(searchText);
      setMatches(newMatches);
      if (newMatches.length > 0) {
        const newIndex = Math.min(currentIdx, newMatches.length - 1);
        setCurrentMatchIndex(newIndex);
        goToMatch(newIndex);
      } else {
        setCurrentMatchIndex(-1);
      }
    }, 0);
  }, [view, replaceText, searchText, findMatches, goToMatch]);

  // Replace all matches
  const replaceAll = useCallback(() => {
    const currentMatches = matchesRef.current;
    if (!view || currentMatches.length === 0) return;

    const { state, dispatch } = view;
    let tr = state.tr;

    // Replace from end to start to preserve positions
    const sortedMatches = [...currentMatches].sort((a, b) => b.from - a.from);

    for (const match of sortedMatches) {
      tr = tr.replaceWith(
        match.from,
        match.to,
        replaceText ? state.schema.text(replaceText) : state.schema.text('')
      );
    }

    dispatch(tr);
    setMatches([]);
    setCurrentMatchIndex(-1);
  }, [view, replaceText]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (e.shiftKey) {
          findPrevious();
        } else {
          findNext();
        }
        e.preventDefault();
      } else if (e.key === 'F' && (e.metaKey || e.ctrlKey)) {
        // Prevent browser find, focus our input
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, findNext, findPrevious]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Get selected text when opening
  useEffect(() => {
    if (isOpen && view) {
      const { state } = view;
      const { from, to } = state.selection;
      if (from !== to) {
        const selectedText = state.doc.textBetween(from, to);
        if (selectedText && selectedText.length < 100) {
          setSearchText(selectedText);
        }
      }
    }
  }, [isOpen, view]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'absolute top-2 right-2 z-50',
        'bg-card border rounded-lg shadow-lg',
        'p-3 w-80',
        'animate-in slide-in-from-top-2 duration-200'
      )}
    >
      {/* Search row */}
      <div className="flex items-center gap-2 mb-2">
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Find..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1 h-8 text-sm"
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={findPrevious}
            disabled={matches.length === 0}
            title="Previous (Shift+Enter)"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={findNext}
            disabled={matches.length === 0}
            title="Next (Enter)"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          title="Close (Escape)"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Replace row */}
      <div className="flex items-center gap-2 mb-2">
        <Input
          type="text"
          placeholder="Replace with..."
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          className="flex-1 h-8 text-sm"
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={replaceCurrent}
            disabled={matches.length === 0}
            title="Replace"
          >
            <Replace className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={replaceAll}
            disabled={matches.length === 0}
            title="Replace All"
          >
            <ReplaceAll className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {matches.length === 0
            ? searchText
              ? 'No matches'
              : 'Type to search'
            : `${currentMatchIndex + 1} of ${matches.length}`}
        </span>
        <button
          onClick={() => setCaseSensitive(!caseSensitive)}
          className={cn(
            'px-2 py-0.5 rounded text-xs font-medium transition-colors',
            caseSensitive
              ? 'bg-primary/20 text-primary'
              : 'hover:bg-muted'
          )}
        >
          Aa
        </button>
      </div>
    </div>
  );
}
