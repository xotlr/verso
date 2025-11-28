'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { EditorView } from 'prosemirror-view';
import {
  AutocompleteState,
  AutocompleteSuggestion,
  autocompletePluginKey,
} from '@/lib/prosemirror/plugins/autocomplete';
import {
  Film,
  User,
  MapPin,
  Clock,
  ArrowRight,
  Mic,
} from 'lucide-react';

interface AutocompleteDropdownProps {
  view: EditorView | null;
  state: AutocompleteState;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
}

/**
 * Get icon for suggestion category.
 */
function getCategoryIcon(category: AutocompleteSuggestion['category']) {
  switch (category) {
    case 'character':
      return <User className="h-3.5 w-3.5" />;
    case 'location':
      return <MapPin className="h-3.5 w-3.5" />;
    case 'time':
      return <Clock className="h-3.5 w-3.5" />;
    case 'transition':
      return <ArrowRight className="h-3.5 w-3.5" />;
    case 'extension':
      return <Mic className="h-3.5 w-3.5" />;
    default:
      return <Film className="h-3.5 w-3.5" />;
  }
}

/**
 * Get category label color.
 */
function getCategoryColor(category: AutocompleteSuggestion['category']) {
  switch (category) {
    case 'character':
      return 'text-purple-500';
    case 'location':
      return 'text-blue-500';
    case 'time':
      return 'text-amber-500';
    case 'transition':
      return 'text-orange-500';
    case 'extension':
      return 'text-emerald-500';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Autocomplete dropdown component for ProseMirror editor.
 */
export function AutocompleteDropdown({
  view,
  state,
  onSelect,
}: AutocompleteDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [state.selectedIndex]);

  // Calculate position based on cursor
  const position = React.useMemo(() => {
    if (!view || !state.active) return null;

    try {
      const { $head } = view.state.selection;
      const coords = view.coordsAtPos($head.pos);

      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Dropdown dimensions (estimated)
      const dropdownWidth = 280;
      const dropdownHeight = Math.min(state.suggestions.length * 44 + 8, 300);

      // Calculate left position
      let left = coords.left;
      if (left + dropdownWidth > viewportWidth - 20) {
        left = viewportWidth - dropdownWidth - 20;
      }
      left = Math.max(10, left);

      // Calculate top position (prefer below cursor)
      let top = coords.bottom + 8;
      if (top + dropdownHeight > viewportHeight - 20) {
        // Position above cursor instead
        top = coords.top - dropdownHeight - 8;
      }
      top = Math.max(10, top);

      return { top, left };
    } catch {
      return null;
    }
  }, [view, state.active, state.suggestions.length]);

  if (!state.active || !position || state.suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'fixed z-50 w-[280px] max-h-[300px]',
        'overflow-y-auto overscroll-contain',
        'bg-popover/95 backdrop-blur-md',
        'border border-border rounded-lg shadow-xl',
        'animate-in fade-in-0 slide-in-from-top-2 duration-150',
        'py-1'
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {state.suggestions.map((suggestion, index) => (
        <button
          key={`${suggestion.category}-${suggestion.value}`}
          ref={index === state.selectedIndex ? selectedRef : null}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5',
            'text-left text-sm',
            'transition-colors duration-75',
            'focus:outline-none',
            index === state.selectedIndex
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent/50'
          )}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => {
            // Update selected index on hover
            if (view) {
              const newState = { ...state, selectedIndex: index };
              view.dispatch(
                view.state.tr.setMeta(autocompletePluginKey, newState)
              );
            }
          }}
        >
          <span className={cn('flex-shrink-0', getCategoryColor(suggestion.category))}>
            {getCategoryIcon(suggestion.category)}
          </span>
          <span className="flex-1 truncate font-medium">
            {suggestion.label}
          </span>
          {suggestion.description && (
            <span className="flex-shrink-0 text-xs text-muted-foreground">
              {suggestion.description}
            </span>
          )}
        </button>
      ))}

      {/* Keyboard hint */}
      <div className="px-3 py-1.5 border-t border-border mt-1">
        <p className="text-xs text-muted-foreground flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">↑</kbd>
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Tab</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Esc</kbd>
            dismiss
          </span>
        </p>
      </div>
    </div>
  );
}

export default AutocompleteDropdown;
