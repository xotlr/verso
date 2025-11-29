'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Underline,
  Heading,
  MessageSquare,
  User,
  Film,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ElementType,
  ELEMENT_DISPLAY_NAMES,
  ELEMENT_CYCLE_ORDER,
} from '@/lib/prosemirror';
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
} from '@/lib/prosemirror/plugins/keymap';
import { setElementType } from '@/lib/prosemirror/plugins/element-switching';

interface FloatingToolbarProps {
  view: EditorView | null;
  className?: string;
  scrollbarWidth?: number;
}

interface ToolbarPosition {
  top: number;
  left: number;
  visible: boolean;
}

/**
 * Get the current element type at cursor position.
 */
function getCurrentElementType(state: EditorState): ElementType {
  const { $from } = state.selection;
  const node = $from.parent;
  return (node.type.name as ElementType) || 'action';
}

/**
 * Check if a mark is active in the current selection.
 */
function isMarkActive(state: EditorState, markType: string): boolean {
  const { from, $from, to, empty } = state.selection;
  const type = state.schema.marks[markType];
  if (!type) return false;

  if (empty) {
    return !!type.isInSet(state.storedMarks || $from.marks());
  }
  return state.doc.rangeHasMark(from, to, type);
}

/**
 * Element type icons.
 */
const ELEMENT_ICONS: Record<ElementType, React.ReactNode> = {
  scene_heading: <Film className="h-4 w-4" />,
  action: <Heading className="h-4 w-4" />,
  character: <User className="h-4 w-4" />,
  dialogue: <MessageSquare className="h-4 w-4" />,
  parenthetical: <span className="text-xs font-mono">()</span>,
  transition: <ArrowRight className="h-4 w-4" />,
  dual_dialogue: <User className="h-4 w-4" />,
};

/**
 * Floating toolbar that appears on text selection.
 * Provides quick access to formatting and element type changes.
 */
export function FloatingToolbar({ view, className, scrollbarWidth = 8 }: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<ToolbarPosition>({
    top: 0,
    left: 0,
    visible: false,
  });
  const [currentElement, setCurrentElement] = useState<ElementType>('action');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderlined, setIsUnderlined] = useState(false);

  // Update toolbar position based on selection
  const updatePosition = useCallback(() => {
    if (!view) {
      setPosition((prev) => ({ ...prev, visible: false }));
      return;
    }

    const { state } = view;
    const { selection } = state;
    const { empty, from, to } = selection;

    // Hide if selection is empty or just a cursor
    if (empty) {
      setPosition((prev) => ({ ...prev, visible: false }));
      return;
    }

    // Get selection coordinates
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);

    // Calculate toolbar position (centered above selection)
    const toolbarWidth = toolbarRef.current?.offsetWidth || 280;
    const toolbarHeight = toolbarRef.current?.offsetHeight || 40;

    // Account for scrollbar width to avoid overlapping
    const left = Math.max(
      10,
      Math.min(
        window.innerWidth - toolbarWidth - 10 - scrollbarWidth,
        (start.left + end.left) / 2 - toolbarWidth / 2
      )
    );

    const top = Math.max(10, start.top - toolbarHeight - 10);

    // Update mark states
    setIsBold(isMarkActive(state, 'bold'));
    setIsItalic(isMarkActive(state, 'italic'));
    setIsUnderlined(isMarkActive(state, 'underline'));
    setCurrentElement(getCurrentElementType(state));

    setPosition({
      top,
      left,
      visible: true,
    });
  }, [view, scrollbarWidth]);

  // Subscribe to editor updates
  useEffect(() => {
    if (!view) return;

    // Create a transaction listener
    const handleTransaction = () => {
      requestAnimationFrame(updatePosition);
    };

    // Listen to selection changes
    const domHandler = () => {
      requestAnimationFrame(updatePosition);
    };

    // Add event listeners
    document.addEventListener('selectionchange', domHandler);

    // Initial update
    updatePosition();

    return () => {
      document.removeEventListener('selectionchange', domHandler);
    };
  }, [view, updatePosition]);

  // Handle format button clicks
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

  // Handle element type change
  const handleElementChange = useCallback(
    (elementType: ElementType) => {
      if (!view) return;
      setElementType(elementType)(view.state, view.dispatch);
      view.focus();
    },
    [view]
  );

  if (!position.visible) {
    return null;
  }

  return (
    <div
      ref={toolbarRef}
      className={cn(
        'fixed z-50',
        'flex items-center gap-0.5 p-1',
        'bg-popover/98 backdrop-blur-lg',  /* Improved legibility (was 95/md) */
        'border border-border rounded-lg shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        className
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      {/* Element Type Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1 text-xs font-medium"
          >
            {ELEMENT_ICONS[currentElement]}
            <span className="hidden sm:inline">
              {ELEMENT_DISPLAY_NAMES[currentElement]}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {ELEMENT_CYCLE_ORDER.map((type) => (
            <DropdownMenuItem
              key={type}
              onClick={() => handleElementChange(type)}
              className={cn(
                'flex items-center gap-2',
                currentElement === type && 'bg-accent'
              )}
            >
              {ELEMENT_ICONS[type]}
              <span>{ELEMENT_DISPLAY_NAMES[type]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Format Buttons */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-8 p-0',
          isBold && 'bg-accent text-accent-foreground'
        )}
        onClick={handleBold}
        title="Bold (Cmd+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-8 p-0',
          isItalic && 'bg-accent text-accent-foreground'
        )}
        onClick={handleItalic}
        title="Italic (Cmd+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-8 p-0',
          isUnderlined && 'bg-accent text-accent-foreground'
        )}
        onClick={handleUnderline}
        title="Underline (Cmd+U)"
      >
        <Underline className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default FloatingToolbar;
