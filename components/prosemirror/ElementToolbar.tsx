'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { EditorView } from 'prosemirror-view';
import { cn } from '@/lib/utils';
import {
  AlignLeft,
  Type,
  User,
  MessageSquare,
  Parentheses,
  ArrowRight,
  FileText,
  Camera,
} from 'lucide-react';
import { ElementType, ELEMENT_CYCLE_ORDER } from '@/lib/prosemirror';
import { setElementType } from '@/lib/prosemirror/plugins/element-switching';
import { useSidebar } from '@/components/ui/sidebar';

interface ElementToolbarProps {
  view: EditorView | null;
  currentElementType: ElementType;
  className?: string;
}

// Element type icons
const ELEMENT_ICONS: Record<ElementType, React.ReactNode> = {
  title_page: <FileText size={14} />,
  scene_heading: <AlignLeft size={14} />,
  action: <Type size={14} />,
  character: <User size={14} />,
  dialogue: <MessageSquare size={14} />,
  parenthetical: <Parentheses size={14} />,
  transition: <ArrowRight size={14} />,
  shot: <Camera size={14} />,
  super: <Type size={14} />,
  chyron: <Type size={14} />,
  flashback: <Type size={14} />,
  montage: <Type size={14} />,
  intercut: <Type size={14} />,
  dual_dialogue: <MessageSquare size={14} />,
  ending: <Type size={14} />,
};

// Short labels for toolbar buttons
const SHORT_LABELS: Record<ElementType, string> = {
  title_page: 'Title',
  scene_heading: 'Scene',
  action: 'Action',
  character: 'Char',
  dialogue: 'Dialog',
  parenthetical: 'Paren',
  transition: 'Trans',
  shot: 'Shot',
  super: 'Super',
  chyron: 'Chyron',
  flashback: 'Flash',
  montage: 'Mont',
  intercut: 'Inter',
  dual_dialogue: 'Dual',
  ending: 'End',
};

// Auto-hide timeout in milliseconds
const AUTO_HIDE_DELAY = 3000;

/**
 * Element type toolbar - classic style with contextual visibility.
 * Shows all element types in a horizontal pill, auto-hides after inactivity.
 */
export function ElementToolbar({ view, currentElementType, className }: ElementToolbarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [, setFocusedIndex] = useState(-1);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { isMobile } = useSidebar();

  // Elements to show in toolbar (memoized to avoid recreating on each render)
  const toolbarElements = useMemo<ElementType[]>(() => [...ELEMENT_CYCLE_ORDER], []);

  // Toolbar should be visible if timer says so OR if mouse is hovering
  const shouldBeVisible = isVisible || isHovering;

  // Calculate sidebar offset: half the sidebar width to center in content area
  // Sidebar is always 3.5rem (icon-only mode), so offset is half of that
  const sidebarOffset = isMobile ? '0rem' : '1.75rem';

  // Show toolbar and reset auto-hide timer
  const showToolbar = useCallback(() => {
    setIsVisible(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, AUTO_HIDE_DELAY);
  }, []);

  // Show toolbar on editor activity
  useEffect(() => {
    if (!view) return;

    // Show on focus
    const handleFocus = () => showToolbar();

    // Show on transaction (typing, selection change, etc.)
    const originalDispatch = view.dispatch.bind(view);
    view.dispatch = (tr) => {
      showToolbar();
      return originalDispatch(tr);
    };

    // Initial show
    showToolbar();

    // Listen for editor DOM events
    const editorDOM = view.dom;
    editorDOM.addEventListener('focus', handleFocus);
    editorDOM.addEventListener('click', showToolbar);
    editorDOM.addEventListener('keydown', showToolbar);

    return () => {
      editorDOM.removeEventListener('focus', handleFocus);
      editorDOM.removeEventListener('click', showToolbar);
      editorDOM.removeEventListener('keydown', showToolbar);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [view, showToolbar]);

  const handleElementChange = useCallback((type: ElementType) => {
    if (!view) return;

    // Apply the element type change FIRST (before focus to ensure it registers)
    const command = setElementType(type);
    command(view.state, view.dispatch);

    // Then focus the editor
    view.focus();

    // Reset visibility timer
    showToolbar();
  }, [view, showToolbar]);

  // Keyboard handler for arrow navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % toolbarElements.length;
      setFocusedIndex(nextIndex);
      buttonRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = index <= 0 ? toolbarElements.length - 1 : index - 1;
      setFocusedIndex(prevIndex);
      buttonRefs.current[prevIndex]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleElementChange(toolbarElements[index]);
    } else if (e.key === 'Escape') {
      // Return focus to editor
      view?.focus();
    }
  }, [toolbarElements, handleElementChange, view]);

  return (
    <div
      className={cn(
        'fixed bottom-6 z-40',
        // Hide on mobile - MobileEditorToolbar handles element selection
        'hidden md:flex',
        // Desktop: use CSS variable for dynamic sidebar offset
        'left-[calc(50%_+_var(--sidebar-offset))] -translate-x-1/2',
        // Horizontal layout like classic editor
        'items-center gap-0.5 p-1',
        'bg-background rounded-[var(--radius)] border border-border shadow-lg',
        // Contextual visibility
        'transition-opacity duration-300',
        shouldBeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
      style={{
        '--sidebar-offset': sidebarOffset,
      } as React.CSSProperties}
      onMouseEnter={() => {
        setIsHovering(true);
        showToolbar();
      }}
      onMouseLeave={() => {
        setIsHovering(false);
      }}
    >
      {toolbarElements.map((type, index) => {
        const isActive = type === currentElementType;

        return (
          <button
            key={type}
            ref={(el) => { buttonRefs.current[index] = el; }}
            tabIndex={index === 0 ? 0 : -1}
            onClick={() => handleElementChange(type)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={() => setFocusedIndex(index)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md',
              'text-[11px] font-medium uppercase tracking-wide',
              'transition-all duration-150',
              'hover:-translate-y-0.5 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            title={`${type.replace('_', ' ')} (Tab to cycle)`}
          >
            {ELEMENT_ICONS[type]}
            <span className="hidden sm:inline">{SHORT_LABELS[type]}</span>
          </button>
        );
      })}
    </div>
  );
}
