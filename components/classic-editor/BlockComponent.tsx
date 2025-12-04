'use client';

import React, { useRef, useEffect, memo } from 'react';
import { ScriptBlock, FORMATTING_RULES, LINE_HEIGHT_PX, BlockType, RevisionColor } from '@/lib/classic-editor/types';

interface BlockProps {
  block: ScriptBlock;
  isActive: boolean;
  onChange: (id: string, content: string) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string) => void;
  onClick: (id: string) => void;
  onPasteMultiline?: (blockId: string, text: string) => void;
}

const REVISION_COLORS: Record<RevisionColor, string> = {
  [RevisionColor.NONE]: 'text-black',
  [RevisionColor.BLUE]: 'text-blue-600',
  [RevisionColor.PINK]: 'text-pink-500',
  [RevisionColor.YELLOW]: 'text-amber-500',
  [RevisionColor.GREEN]: 'text-green-600',
  [RevisionColor.GOLDENROD]: 'text-yellow-600',
  [RevisionColor.BUFF]: 'text-orange-400',
  [RevisionColor.SALMON]: 'text-rose-400',
  [RevisionColor.CHERRY]: 'text-red-600'
};

export const BlockComponent = memo(function BlockComponent({
  block,
  isActive,
  onChange,
  onKeyDown,
  onClick,
  onPasteMultiline
}: BlockProps) {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const rules = FORMATTING_RULES[block.type];

  // --- FOCUS MANAGEMENT ---
  useEffect(() => {
    if (isActive && contentEditableRef.current) {
      if (document.activeElement !== contentEditableRef.current) {
        contentEditableRef.current.focus();
        // Move cursor to end
        const range = document.createRange();
        range.selectNodeContents(contentEditableRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [isActive]);

  // --- CONTENT SYNC ---
  useEffect(() => {
    if (contentEditableRef.current && contentEditableRef.current.innerHTML !== block.content) {
      contentEditableRef.current.innerHTML = block.content;
    }
  }, [block.content]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const val = e.currentTarget.innerHTML;
    onChange(block.id, val);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');

    // Check if multi-line paste - delegate to parent for screenplay parsing
    if (text.includes('\n') && onPasteMultiline) {
      onPasteMultiline(block.id, text);
      return;
    }

    // Single line - insert normally
    document.execCommand('insertText', false, text);
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent) => {
    // Rich Text Shortcuts
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      if (e.key === 'b') {
        e.preventDefault();
        document.execCommand('bold', false);
        return;
      }
      if (e.key === 'i') {
        e.preventDefault();
        document.execCommand('italic', false);
        return;
      }
      if (e.key === 'u') {
        e.preventDefault();
        document.execCommand('underline', false);
        return;
      }
    }
    onKeyDown(e, block.id);
  };

  // Safe Click Handler: Doesn't steal focus if user is selecting text
  const handleClick = () => {
    // Check if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.type === 'Range' && !selection.isCollapsed) {
      return;
    }
    onClick(block.id);
  };

  // Dynamic Rendering Style for Script Blocks
  const containerStyle: React.CSSProperties = {
    marginLeft: `${rules.marginLeftPx}px`,
    width: `${rules.widthPx}px`,
    paddingTop: `${rules.marginTopLines * LINE_HEIGHT_PX}px`,
    position: 'relative',
    textAlign: rules.textAlign || 'left',
  };

  // Use theme-aware text color, with revision colors still working
  const revisionColorClass = block.revision && block.revision !== RevisionColor.NONE
    ? REVISION_COLORS[block.revision]
    : 'text-foreground';
  const isSection = block.type === BlockType.SECTION;

  return (
    <div
      className="group transition-none rounded-none"
      style={containerStyle}
      onClick={handleClick}
    >
      {/* Type Label (Ghost UI - Only shows when active) */}
      <div className={`
        absolute -left-24 top-0 opacity-0
        ${isActive ? 'opacity-100' : 'group-hover:opacity-0'}
        transition-opacity duration-200
        text-[9px] text-muted-foreground font-sans tracking-widest uppercase text-right w-20 select-none
        pointer-events-none mt-[2px]
      `}>
        {isActive ? rules.label : ''}
      </div>

      {/* Grip Handle for Reordering (Visible on hover) */}
      <div className="absolute -left-6 top-0 opacity-0 group-hover:opacity-20 cursor-grab active:cursor-grabbing text-muted-foreground select-none" style={{ marginTop: `${rules.marginTopLines * LINE_HEIGHT_PX}px` }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </div>

      {/* Scene Number - Gutter Left */}
      {block.type === BlockType.SCENE_HEADING && block.sceneNumber && (
        <div
          className="absolute select-none text-muted-foreground/80 font-mono"
          style={{
            left: '-80px', // In the 1.5" gutter
            top: `${rules.marginTopLines * LINE_HEIGHT_PX}px`,
            width: '60px',
            textAlign: 'right',
            fontSize: '16px',
            lineHeight: '16px',
          }}
        >
          {block.sceneNumber}
        </div>
      )}

      {/* REVISION MARK (ASTERISK) - Gutter Right */}
      {block.revision && block.revision !== RevisionColor.NONE && (
        <div
          className={`absolute select-none font-mono text-[16px] font-bold ${REVISION_COLORS[block.revision]}`}
          style={{
            // Position in the right margin area.
            // The block width ends at printable area.
            // We want it in the 1.0" right margin.
            right: `-30px`, // Float nicely to the right
            top: `${rules.marginTopLines * LINE_HEIGHT_PX}px`,
          }}
        >
          *
        </div>
      )}

      {/* Content */}
      <div
        ref={contentEditableRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDownInternal}
        onPaste={handlePaste}
        className={`
          w-full bg-transparent outline-none overflow-hidden
          font-mono block ${revisionColorClass}
          empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:pointer-events-none
          ${isSection ? 'font-bold underline' : ''}
        `}
        style={{
          fontFamily: '"Courier Prime", "Courier New", Courier, monospace',
          fontSize: '16px', // 12pt
          lineHeight: '16px', // Single spacing
          whiteSpace: 'pre-wrap',
          textTransform: rules.uppercase ? 'uppercase' : 'none',
          minHeight: '16px',
        }}
        data-placeholder={isActive ? rules.placeholder : ''}
        spellCheck={false}
        suppressContentEditableWarning={true}
      />
    </div>
  );
});
