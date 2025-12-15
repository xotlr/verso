'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  dual_dialogue: <MessageSquare size={14} />,
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
  dual_dialogue: 'Dual',
};

// Auto-hide timeout in milliseconds
const AUTO_HIDE_DELAY = 3000;

/**
 * Element type toolbar - classic style with contextual visibility.
 * Shows all element types in a horizontal pill, auto-hides after inactivity.
 */
export function ElementToolbar({ view, currentElementType, className }: ElementToolbarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { state: sidebarState, isMobile } = useSidebar();

  // Calculate sidebar offset: half the sidebar width to center in content area
  const sidebarOffset = useMemo(() => {
    if (isMobile) return '0rem';
    return sidebarState === 'expanded' ? '8rem' : '1.5rem';
  }, [sidebarState, isMobile]);

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

    // Focus the editor first
    view.focus();

    // Apply the element type change
    const command = setElementType(type);
    command(view.state, view.dispatch);

    // Reset visibility timer
    showToolbar();
  }, [view, showToolbar]);

  // Elements to show in toolbar (exclude dual_dialogue from main cycling)
  const toolbarElements: ElementType[] = [...ELEMENT_CYCLE_ORDER];

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
        'bg-popover/95 backdrop-blur-md rounded-full border border-border shadow-lg',
        // Contextual visibility
        'transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
      style={{
        '--sidebar-offset': sidebarOffset,
      } as React.CSSProperties}
      onMouseEnter={showToolbar}
    >
      {toolbarElements.map((type) => {
        const isActive = type === currentElementType;

        return (
          <button
            key={type}
            onClick={() => handleElementChange(type)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full',
              'text-[11px] font-medium uppercase tracking-wide',
              'transition-all duration-150',
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
