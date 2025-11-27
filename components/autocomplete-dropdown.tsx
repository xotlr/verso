'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface AutocompleteSuggestion {
  value: string;
  label: string;
  category?: string;
}

interface AutocompleteDropdownProps {
  suggestions: AutocompleteSuggestion[];
  isOpen: boolean;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  onClose: () => void;
  position: { top: number; left: number };
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
}

export function AutocompleteDropdown({
  suggestions,
  isOpen,
  onSelect,
  onClose,
  position,
  selectedIndex,
  onSelectedIndexChange,
}: AutocompleteDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          onSelectedIndexChange(Math.min(selectedIndex + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          onSelectedIndexChange(Math.max(selectedIndex - 1, 0));
          break;
        case 'Enter':
        case 'Tab':
          if (suggestions[selectedIndex]) {
            e.preventDefault();
            onSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, selectedIndex, suggestions, onSelect, onClose, onSelectedIndexChange]);

  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div
      className="fixed z-50 min-w-[200px] max-w-[400px] max-h-[300px] overflow-y-auto bg-popover border border-border rounded-lg shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div ref={listRef} className="py-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.value}
            type="button"
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => onSelectedIndexChange(index)}
            className={cn(
              'w-full text-left px-3 py-2 text-sm transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              index === selectedIndex && 'bg-accent text-accent-foreground'
            )}
          >
            <div className="font-medium text-foreground">{suggestion.label}</div>
            {suggestion.category && (
              <div className="text-xs text-muted-foreground">{suggestion.category}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Utility hooks for autocomplete
export function useAutocomplete(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  getSuggestions: (context: AutocompleteContext) => AutocompleteSuggestion[]
) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [currentWord, setCurrentWord] = useState('');
  const [wordStart, setWordStart] = useState(0);

  const updateAutocomplete = (text: string, cursorPosition: number) => {
    const context = getAutocompleteContext(text, cursorPosition);

    if (!context.shouldShow) {
      setIsOpen(false);
      return;
    }

    const newSuggestions = getSuggestions(context);

    if (newSuggestions.length === 0) {
      setIsOpen(false);
      return;
    }

    setSuggestions(newSuggestions);
    setCurrentWord(context.currentWord);
    setWordStart(context.wordStart);
    setSelectedIndex(0);

    // Calculate position based on cursor in textarea
    if (textareaRef.current) {
      const pos = getCaretCoordinates(textareaRef.current, context.wordStart);
      setPosition({
        top: pos.top + 24, // Below the line
        left: pos.left,
      });
    }

    setIsOpen(true);
  };

  const selectSuggestion = (suggestion: AutocompleteSuggestion) => {
    if (!textareaRef.current) return null;

    const text = textareaRef.current.value;
    const before = text.substring(0, wordStart);
    const after = text.substring(wordStart + currentWord.length);
    const newText = before + suggestion.value + after;
    const newCursorPosition = wordStart + suggestion.value.length;

    setIsOpen(false);
    return { newText, newCursorPosition };
  };

  const close = () => setIsOpen(false);

  return {
    isOpen,
    suggestions,
    selectedIndex,
    setSelectedIndex,
    position,
    updateAutocomplete,
    selectSuggestion,
    close,
  };
}

export interface AutocompleteContext {
  shouldShow: boolean;
  type: 'character' | 'scene-heading' | 'location' | 'time-of-day' | 'transition' | 'none';
  currentWord: string;
  wordStart: number;
  lineContent: string;
  lineStart: number;
  previousLine: string;
}

export function getAutocompleteContext(text: string, cursorPosition: number): AutocompleteContext {
  // Get the current line
  const beforeCursor = text.substring(0, cursorPosition);
  const afterCursor = text.substring(cursorPosition);

  const lineStart = beforeCursor.lastIndexOf('\n') + 1;
  const lineEnd = afterCursor.indexOf('\n');
  const lineContent = text.substring(lineStart, lineEnd === -1 ? text.length : cursorPosition + lineEnd);
  const textOnLineBeforeCursor = beforeCursor.substring(lineStart);

  // Get previous line
  const textBeforeCurrentLine = text.substring(0, lineStart - 1);
  const prevLineStart = textBeforeCurrentLine.lastIndexOf('\n') + 1;
  const previousLine = text.substring(prevLineStart, lineStart - 1).trim();

  // Get current word being typed
  const wordMatch = textOnLineBeforeCursor.match(/[A-Za-z0-9.'/-]+$/);
  const currentWord = wordMatch ? wordMatch[0] : '';
  const wordStart = lineStart + textOnLineBeforeCursor.length - currentWord.length;

  // Determine context type
  let type: AutocompleteContext['type'] = 'none';
  let shouldShow = false;

  // Scene heading autocomplete (INT./EXT.)
  if (previousLine === '' && /^(INT|EXT|I\/E)?\.?$/i.test(textOnLineBeforeCursor.trim())) {
    type = 'scene-heading';
    shouldShow = true;
  }
  // Location autocomplete (after INT./EXT.)
  else if (/^(INT|EXT|INT\/EXT|I\/E)\.\s*/i.test(textOnLineBeforeCursor) && !textOnLineBeforeCursor.includes(' - ')) {
    type = 'location';
    shouldShow = currentWord.length >= 1;
  }
  // Time of day autocomplete (after " - ")
  else if (/^(INT|EXT|INT\/EXT|I\/E)\.\s+.+\s+-\s*/i.test(textOnLineBeforeCursor)) {
    type = 'time-of-day';
    shouldShow = true;
  }
  // Character name autocomplete (uppercase line after blank line)
  else if (previousLine === '' && /^[A-Z][A-Z\s'.-]*$/i.test(textOnLineBeforeCursor.trim()) && textOnLineBeforeCursor.trim().length >= 2) {
    const isAllCaps = textOnLineBeforeCursor.trim() === textOnLineBeforeCursor.trim().toUpperCase();
    if (isAllCaps) {
      type = 'character';
      shouldShow = true;
    }
  }
  // Transition autocomplete
  else if (previousLine === '' && /^(CUT|FADE|DISSOLVE|SMASH|MATCH|IRIS|WIPE)/i.test(textOnLineBeforeCursor.trim())) {
    type = 'transition';
    shouldShow = true;
  }

  return {
    shouldShow,
    type,
    currentWord,
    wordStart,
    lineContent,
    lineStart,
    previousLine,
  };
}

// Get caret coordinates in textarea
function getCaretCoordinates(element: HTMLTextAreaElement, position: number): { top: number; left: number } {
  // Create a mirror div to measure text
  const mirror = document.createElement('div');
  const computed = getComputedStyle(element);

  // Copy styles
  mirror.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: ${computed.fontFamily};
    font-size: ${computed.fontSize};
    line-height: ${computed.lineHeight};
    padding: ${computed.padding};
    width: ${computed.width};
    box-sizing: ${computed.boxSizing};
  `;

  document.body.appendChild(mirror);

  // Insert text up to cursor and a span marker
  const textBeforeCursor = element.value.substring(0, position);
  mirror.textContent = textBeforeCursor;

  const marker = document.createElement('span');
  marker.textContent = '|';
  mirror.appendChild(marker);

  const rect = element.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();

  document.body.removeChild(mirror);

  return {
    top: rect.top + (markerRect.top - mirror.getBoundingClientRect().top) + element.scrollTop,
    left: rect.left + (markerRect.left - mirror.getBoundingClientRect().left) - element.scrollLeft,
  };
}
