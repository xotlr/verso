'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { useSettings } from '@/contexts/settings-context';

interface AutocompleteDropdownProps {
  view: EditorView | null;
  state: AutocompleteState;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
}

/**
 * Get icon for suggestion category.
 */
function getCategoryIcon(category: AutocompleteSuggestion['category']) {
  const iconClass = "h-3 w-3 text-muted-foreground/60";

  switch (category) {
    case 'character':
      return <User className={iconClass} />;
    case 'location':
      return <MapPin className={iconClass} />;
    case 'time':
      return <Clock className={iconClass} />;
    case 'transition':
      return <ArrowRight className={iconClass} />;
    case 'extension':
      return <Mic className={iconClass} />;
    default:
      return <Film className={iconClass} />;
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
  const { settings } = useSettings();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const delayMs = settings.editor.autocomplete?.delayMs ?? 0;
  const enabled = settings.editor.autocomplete?.enabled ?? true;

  // Handle delay logic
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // If not enabled or not active, hide immediately
    if (!enabled || !state.active) {
      setShowDropdown(false);
      return;
    }

    // If no delay, show immediately
    if (delayMs === 0) {
      setShowDropdown(true);
      return;
    }

    // Start delay timer
    timerRef.current = setTimeout(() => {
      setShowDropdown(true);
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [state.active, delayMs, enabled]);

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
      const dropdownWidth = 200;
      const dropdownHeight = Math.min(state.suggestions.length * 38 + 8, 220);

      // Offset configuration
      const OFFSET_X = 40;  // pixels to the right
      const OFFSET_Y = -4;  // slight upward adjustment

      // Try positioning to the right of cursor
      let left = coords.left + OFFSET_X;

      // If too close to right edge, position to the left instead
      if (left + dropdownWidth > viewportWidth - 20) {
        left = coords.left - dropdownWidth - 10;
      }
      left = Math.max(10, left);

      // Position at cursor height, but flip above if needed
      let top = coords.top + OFFSET_Y;
      if (top + dropdownHeight > viewportHeight - 20) {
        top = coords.top - dropdownHeight + OFFSET_Y;
      }
      top = Math.max(10, top);

      return { top, left };
    } catch {
      return null;
    }
  }, [view, state.active, state.suggestions.length]);

  // Don't render if disabled, delayed, or no suggestions
  if (!enabled || !showDropdown || !position || state.suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'fixed z-50 w-[200px] max-h-[220px]',
        'overflow-y-auto overscroll-contain',
        'bg-popover/85 backdrop-blur-sm',
        'border border-border/50 rounded-lg shadow-md',
        showDropdown
          ? 'animate-in fade-in-0 duration-200'
          : 'animate-out fade-out-0 duration-150',
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
            'w-full flex items-center gap-2 px-2.5 py-1.5',
            'text-left text-sm',
            'transition-colors duration-75',
            'focus:outline-none rounded-sm',
            index === state.selectedIndex
              ? 'bg-accent/30 text-accent-foreground'
              : 'hover:bg-accent/15'
          )}
          onClick={() => onSelect(suggestion)}
          onMouseDown={(e) => e.preventDefault()} // Prevent losing editor focus
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
          <span className="flex-shrink-0">
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
    </div>
  );
}

export default AutocompleteDropdown;
