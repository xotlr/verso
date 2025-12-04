'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { EditorView } from 'prosemirror-view';
import { cn } from '@/lib/utils';
import {
  AlignLeft,
  Type,
  User,
  MessageSquare,
  Parentheses,
  ArrowRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { ELEMENT_DISPLAY_NAMES, ElementType, ELEMENT_CYCLE_ORDER } from '@/lib/prosemirror';
import { setElementType } from '@/lib/prosemirror/plugins/element-switching';
import { useSidebar } from '@/components/ui/sidebar';

interface ElementToolbarProps {
  view: EditorView | null;
  currentElementType: ElementType;
  className?: string;
}

// Element type icons
const ELEMENT_ICONS: Record<ElementType, React.ReactNode> = {
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
  scene_heading: 'Scene',
  action: 'Action',
  character: 'Char',
  dialogue: 'Dialog',
  parenthetical: 'Paren',
  transition: 'Trans',
  dual_dialogue: 'Dual',
};

// Color classes by element type
const COLOR_CLASSES: Record<ElementType, { active: string; inactive: string }> = {
  scene_heading: {
    active: 'bg-blue-500 text-white',
    inactive: 'text-blue-500 hover:bg-blue-500/10'
  },
  action: {
    active: 'bg-zinc-600 text-white',
    inactive: 'text-zinc-400 hover:bg-zinc-500/10'
  },
  character: {
    active: 'bg-purple-500 text-white',
    inactive: 'text-purple-500 hover:bg-purple-500/10'
  },
  dialogue: {
    active: 'bg-zinc-700 text-white',
    inactive: 'text-zinc-300 hover:bg-zinc-500/10'
  },
  parenthetical: {
    active: 'bg-zinc-600 text-white',
    inactive: 'text-zinc-400 hover:bg-zinc-500/10'
  },
  transition: {
    active: 'bg-orange-500 text-white',
    inactive: 'text-orange-500 hover:bg-orange-500/10'
  },
  dual_dialogue: {
    active: 'bg-violet-500 text-white',
    inactive: 'text-violet-500 hover:bg-violet-500/10'
  },
};

/**
 * Expandable element type toolbar.
 *
 * Compact: Shows current element type as a clickable pill
 * Expanded: Shows all element type buttons for quick switching
 */
export function ElementToolbar({ view, currentElementType, className }: ElementToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { state: sidebarState, isMobile } = useSidebar();

  // Calculate sidebar offset: half the sidebar width to center in content area
  // Sidebar is 16rem expanded, 3rem collapsed (icon mode)
  const sidebarOffset = useMemo(() => {
    if (isMobile) return '0rem';
    return sidebarState === 'expanded' ? '8rem' : '1.5rem';
  }, [sidebarState, isMobile]);

  const handleElementChange = useCallback((type: ElementType) => {
    if (!view) return;

    // Focus the editor first
    view.focus();

    // Apply the element type change
    const command = setElementType(type);
    command(view.state, view.dispatch);

    // Collapse the toolbar after selection
    setIsExpanded(false);
  }, [view]);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Elements to show in toolbar (exclude dual_dialogue from main cycling)
  const toolbarElements: ElementType[] = [...ELEMENT_CYCLE_ORDER];

  return (
    <div
      className={cn(
        'fixed bottom-6 z-40',
        // Hide on mobile - MobileEditorToolbar handles element selection
        'hidden md:block',
        // Desktop: use CSS variable for dynamic sidebar offset
        'left-[calc(50%_+_var(--sidebar-offset))] -translate-x-1/2',
        'transition-[left] duration-200 ease-linear',
        className
      )}
      style={{
        '--sidebar-offset': sidebarOffset,
      } as React.CSSProperties}
    >
      {/* Expanded toolbar */}
      {isExpanded && (
        <div
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
            'flex items-center gap-1 p-1.5',
            'bg-zinc-900/95 backdrop-blur-md',
            'border border-zinc-800 rounded-full',
            'shadow-2xl',
            'animate-in fade-in slide-in-from-bottom-2 duration-150'
          )}
        >
          {toolbarElements.map((type) => {
            const isActive = type === currentElementType;
            const colors = COLOR_CLASSES[type];

            return (
              <button
                key={type}
                onClick={() => handleElementChange(type)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                  'text-xs font-medium uppercase tracking-wide',
                  'transition-all duration-150',
                  isActive ? colors.active : colors.inactive
                )}
                title={`${ELEMENT_DISPLAY_NAMES[type]} (Tab to cycle)`}
              >
                {ELEMENT_ICONS[type]}
                <span className="hidden sm:inline">{SHORT_LABELS[type]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Compact pill (always visible) */}
      <button
        onClick={toggleExpand}
        className={cn(
          'flex items-center gap-2 px-4 py-1.5 rounded-full',
          'bg-card/95 backdrop-blur-sm border',
          'text-xs font-medium uppercase tracking-wider',
          'shadow-md hover:shadow-lg',
          'transition-all duration-200 ease-out',
          'cursor-pointer',
          COLOR_CLASSES[currentElementType].inactive,
          'border-current/30'
        )}
        title="Click to change element type"
      >
        {ELEMENT_ICONS[currentElementType]}
        <span>{ELEMENT_DISPLAY_NAMES[currentElementType]}</span>
        {isExpanded ? (
          <ChevronDown size={12} className="opacity-50" />
        ) : (
          <ChevronUp size={12} className="opacity-50" />
        )}
      </button>
    </div>
  );
}
