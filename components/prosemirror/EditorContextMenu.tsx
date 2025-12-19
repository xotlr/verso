'use client';

import React, { useCallback } from 'react';
import { EditorView } from 'prosemirror-view';
import { undo, redo } from 'prosemirror-history';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import {
  Scissors,
  Copy,
  ClipboardPaste,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Type,
  Film,
  User,
  MessageSquare,
  Parentheses,
  ArrowRight,
  Camera,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
} from '@/lib/prosemirror/plugins/keymap';
import { setElementType } from '@/lib/prosemirror/plugins/element-switching';
import { ElementType, ELEMENT_DISPLAY_NAMES } from '@/lib/prosemirror';

interface EditorContextMenuProps {
  view: EditorView | null;
  children: React.ReactNode;
  onFindReplace?: () => void;
}

// Element type icons for the submenu
const ELEMENT_ICONS: Record<ElementType, React.ReactNode> = {
  title_page: <Type className="h-4 w-4" />,
  scene_heading: <Film className="h-4 w-4" />,
  action: <Type className="h-4 w-4" />,
  character: <User className="h-4 w-4" />,
  dialogue: <MessageSquare className="h-4 w-4" />,
  parenthetical: <Parentheses className="h-4 w-4" />,
  transition: <ArrowRight className="h-4 w-4" />,
  ending: <Type className="h-4 w-4" />,
  shot: <Camera className="h-4 w-4" />,
  super: <Type className="h-4 w-4" />,
  chyron: <Type className="h-4 w-4" />,
  flashback: <Type className="h-4 w-4" />,
  montage: <Type className="h-4 w-4" />,
  intercut: <Type className="h-4 w-4" />,
  dual_dialogue: <MessageSquare className="h-4 w-4" />,
};

// Elements available in Convert To menu
const CONVERTIBLE_ELEMENTS: ElementType[] = [
  'scene_heading',
  'action',
  'character',
  'dialogue',
  'parenthetical',
  'transition',
  'shot',
];

export function EditorContextMenu({ view, children, onFindReplace }: EditorContextMenuProps) {
  // Clipboard operations using native browser API
  const handleCut = useCallback(() => {
    document.execCommand('cut');
    view?.focus();
  }, [view]);

  const handleCopy = useCallback(() => {
    document.execCommand('copy');
    view?.focus();
  }, [view]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (view && text) {
        const { state, dispatch } = view;
        const tr = state.tr.insertText(text);
        dispatch(tr);
      }
    } catch {
      // Fallback to execCommand
      document.execCommand('paste');
    }
    view?.focus();
  }, [view]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (view) {
      undo(view.state, view.dispatch);
      view.focus();
    }
  }, [view]);

  const handleRedo = useCallback(() => {
    if (view) {
      redo(view.state, view.dispatch);
      view.focus();
    }
  }, [view]);

  // Formatting
  const handleBold = useCallback(() => {
    if (view) {
      toggleBold(view.state, view.dispatch);
      view.focus();
    }
  }, [view]);

  const handleItalic = useCallback(() => {
    if (view) {
      toggleItalic(view.state, view.dispatch);
      view.focus();
    }
  }, [view]);

  const handleUnderline = useCallback(() => {
    if (view) {
      toggleUnderline(view.state, view.dispatch);
      view.focus();
    }
  }, [view]);

  // Element type conversion
  const handleConvertTo = useCallback((elementType: ElementType) => {
    if (view) {
      setElementType(elementType)(view.state, view.dispatch, view);
      view.focus();
    }
  }, [view]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent
        className={cn(
          'w-56',
          'backdrop-blur-xl bg-popover/95',
          'border border-border/50',
          'shadow-lg shadow-black/20',
          'rounded-lg'
        )}
      >
        {/* Pill group for Cut/Copy/Paste */}
        <div className="flex justify-center gap-1 p-2">
          <div className="flex gap-0.5 bg-muted/50 rounded-md p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md hover:bg-accent"
              onClick={handleCut}
              title="Cut"
            >
              <Scissors className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md hover:bg-accent"
              onClick={handleCopy}
              title="Copy"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md hover:bg-accent"
              onClick={handlePaste}
              title="Paste"
            >
              <ClipboardPaste className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ContextMenuSeparator />

        {/* Undo/Redo */}
        <ContextMenuItem onClick={handleUndo}>
          <Undo2 className="mr-2 h-4 w-4" />
          Undo
          <ContextMenuShortcut>⌘Z</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleRedo}>
          <Redo2 className="mr-2 h-4 w-4" />
          Redo
          <ContextMenuShortcut>⇧⌘Z</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Formatting */}
        <ContextMenuItem onClick={handleBold}>
          <Bold className="mr-2 h-4 w-4" />
          Bold
          <ContextMenuShortcut>⌘B</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleItalic}>
          <Italic className="mr-2 h-4 w-4" />
          Italic
          <ContextMenuShortcut>⌘I</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleUnderline}>
          <Underline className="mr-2 h-4 w-4" />
          Underline
          <ContextMenuShortcut>⌘U</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Convert To submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Type className="mr-2 h-4 w-4" />
            Convert To
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 backdrop-blur-xl bg-popover/95">
            {CONVERTIBLE_ELEMENTS.map((type) => (
              <ContextMenuItem
                key={type}
                onClick={() => handleConvertTo(type)}
              >
                {ELEMENT_ICONS[type]}
                <span className="ml-2">{ELEMENT_DISPLAY_NAMES[type]}</span>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {onFindReplace && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onFindReplace}>
              <Search className="mr-2 h-4 w-4" />
              Find & Replace
              <ContextMenuShortcut>⌘F</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default EditorContextMenu;
