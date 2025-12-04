'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { BlockComponent } from './BlockComponent';
import { TitlePage } from './TitlePage';
import { Toolbar } from './Toolbar';
import { paginateScript } from '@/lib/classic-editor/layoutEngine';
import { plainTextToBlocks } from '@/lib/classic-editor/converter';
import {
  ScriptBlock,
  BlockType,
  RenderedPage,
  PAGE_WIDTH_PX,
  PAGE_HEIGHT_PX,
  MARGIN_TOP_PX,
  MARGIN_LEFT_PX,
  MARGIN_RIGHT_PX,
  MARGIN_BOTTOM_PX,
  ScriptMetadata,
  TitlePageMetadata,
  RevisionColor,
} from '@/lib/classic-editor/types';
import { useHistory } from '@/hooks/classic-editor/useHistory';

interface ClassicEditorProps {
  initialBlocks: ScriptBlock[];
  initialMetadata: ScriptMetadata;
  onBlocksChange: (blocks: ScriptBlock[]) => void;
  onMetadataChange?: (metadata: ScriptMetadata) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

// Memoized page component to prevent unnecessary re-renders
const PageComponent = memo(function PageComponent({
  page,
  activeBlockId,
  onBlockClick,
  onBlockChange,
  onKeyDown,
  onPageClick,
  onPasteMultiline,
}: {
  page: RenderedPage;
  activeBlockId: string | null;
  onBlockClick: (id: string) => void;
  onBlockChange: (id: string, content: string) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string) => void;
  onPageClick: () => void;
  onPasteMultiline: (blockId: string, text: string) => void;
}) {
  return (
    <div className="relative group">
      <div
        className="screenplay-page bg-card shadow-lg dark:shadow-2xl border border-border/50 relative"
        style={{
          width: `${PAGE_WIDTH_PX}px`,
          height: `${PAGE_HEIGHT_PX}px`,
          padding: `${MARGIN_TOP_PX}px ${MARGIN_RIGHT_PX}px ${MARGIN_BOTTOM_PX}px ${MARGIN_LEFT_PX}px`,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && window.getSelection()?.type !== 'Range') {
            onPageClick();
          }
        }}
      >
        {/* Page Number */}
        {page.pageNumber > 1 && (
          <div className="absolute text-foreground/80 font-mono text-[16px] pointer-events-none select-none right-[96px] top-[48px]">
            {page.pageNumber}.
          </div>
        )}

        {page.blocks.map((block) => (
          <BlockComponent
            key={block.id}
            block={block}
            isActive={block.id === activeBlockId}
            onClick={onBlockClick}
            onChange={onBlockChange}
            onKeyDown={onKeyDown}
            onPasteMultiline={onPasteMultiline}
          />
        ))}
      </div>
    </div>
  );
});

export function ClassicEditor({
  initialBlocks,
  initialMetadata,
  onBlocksChange,
  onMetadataChange,
  onSave,
}: ClassicEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [scale, setScale] = useState(1);
  const currentRevision = useRef<RevisionColor>(RevisionColor.NONE);
  const paginationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blocksRef = useRef<ScriptBlock[]>(initialBlocks);

  // History hook for undo/redo
  const {
    state: { blocks, metadata },
    setHistoryState,
    setEphemeralState,
    undo,
    redo,
  } = useHistory({ blocks: initialBlocks, metadata: initialMetadata });

  // Keep ref in sync
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => setMounted(true), []);

  // Debounced pagination - only run after typing stops
  useEffect(() => {
    if (paginationTimeoutRef.current) {
      clearTimeout(paginationTimeoutRef.current);
    }

    // Immediate pagination for small documents, debounced for large ones
    const delay = blocks.length > 100 ? 150 : 50;

    paginationTimeoutRef.current = setTimeout(() => {
      setPages(paginateScript(blocks, true));
    }, delay);

    return () => {
      if (paginationTimeoutRef.current) {
        clearTimeout(paginationTimeoutRef.current);
      }
    };
  }, [blocks]);

  // Debounced notify parent of changes
  const notifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (notifyTimeoutRef.current) {
      clearTimeout(notifyTimeoutRef.current);
    }

    notifyTimeoutRef.current = setTimeout(() => {
      onBlocksChange(blocks);
    }, 500);

    return () => {
      if (notifyTimeoutRef.current) {
        clearTimeout(notifyTimeoutRef.current);
      }
    };
  }, [blocks, onBlocksChange]);

  // Responsive scale with debounce
  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const width = window.innerWidth;
        // Account for sidebar on larger screens (activity bar 48px + panel 256px when open)
        // On mobile (<768px), sidebar is typically hidden or overlaid
        const sidebarWidth = width >= 768 ? 48 : 0;
        // Reduce padding on mobile for better space utilization
        const padding = width >= 640 ? 64 : 16;
        const availableWidth = width - sidebarWidth - padding;

        let newScale = 1;
        if (availableWidth < PAGE_WIDTH_PX) {
          // Allow smaller scale on mobile for better fit
          newScale = Math.max(0.3, availableWidth / PAGE_WIDTH_PX);
        } else {
          newScale = Math.min(1.1, availableWidth / PAGE_WIDTH_PX);
        }

        setScale(newScale);
      }, 100);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);

  // Memoized active block type
  const activeBlockType = useMemo(() => {
    return blocks.find(b => b.id === activeBlockId)?.type || BlockType.ACTION;
  }, [blocks, activeBlockId]);

  // --- HANDLERS ---
  const updateBlock = useCallback((id: string, content: string) => {
    const revision = currentRevision.current;
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    const currentBlock = blocksRef.current.find(b => b.id === id);

    // Auto-detect ACT/Section patterns - silently convert
    // Matches: ACT 1, ACT ONE, ACT I, ACT II, PROLOGUE, EPILOGUE
    const isActPattern = /^(ACT\s*(ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|[IVX]+|\d+)|PROLOGUE|EPILOGUE)\s*$/i.test(plainText);

    if (isActPattern && currentBlock && currentBlock.type !== BlockType.SECTION) {
      // Auto-convert to SECTION type
      setEphemeralState(prev => ({
        ...prev,
        blocks: prev.blocks.map(b =>
          b.id === id ? { ...b, content, type: BlockType.SECTION, revision: revision !== RevisionColor.NONE ? revision : b.revision } : b
        )
      }));
      return;
    }

    setEphemeralState(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.id === id ? { ...b, content, revision: revision !== RevisionColor.NONE ? revision : b.revision } : b
      )
    }));
  }, [setEphemeralState]);

  const changeBlockType = useCallback((type: BlockType) => {
    if (!activeBlockId) return;
    const revision = currentRevision.current;
    setHistoryState(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.id === activeBlockId ? { ...b, type, revision: revision !== RevisionColor.NONE ? revision : b.revision } : b
      )
    }));
  }, [activeBlockId, setHistoryState]);

  const moveBlock = useCallback((id: string, direction: 'UP' | 'DOWN') => {
    setHistoryState(prev => {
      const idx = prev.blocks.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      if ((direction === 'UP' && idx === 0) || (direction === 'DOWN' && idx === prev.blocks.length - 1)) return prev;
      const newBlocks = [...prev.blocks];
      const swapIdx = direction === 'UP' ? idx - 1 : idx + 1;
      [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
      return { ...prev, blocks: newBlocks };
    });
  }, [setHistoryState]);

  const addBlock = useCallback((afterId: string, type: BlockType = BlockType.ACTION) => {
    const revision = currentRevision.current;
    const newBlock: ScriptBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
      revision: revision !== RevisionColor.NONE ? revision : undefined
    };

    setHistoryState(prev => {
      const index = prev.blocks.findIndex(b => b.id === afterId);
      const newBlocks = index === -1
        ? [...prev.blocks, newBlock]
        : [...prev.blocks.slice(0, index + 1), newBlock, ...prev.blocks.slice(index + 1)];
      return { ...prev, blocks: newBlocks };
    });

    setActiveBlockId(newBlock.id);
  }, [setHistoryState]);

  const deleteBlock = useCallback((id: string) => {
    const currentBlocks = blocksRef.current;
    if (currentBlocks.length <= 1) return;

    const index = currentBlocks.findIndex(b => b.id === id);

    setHistoryState(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== id)
    }));

    if (index > 0) {
      setActiveBlockId(currentBlocks[index - 1].id);
    }
  }, [setHistoryState]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    // Save shortcut
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      onSave?.();
      return;
    }

    // Undo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }

    // Redo (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)
    if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
      e.preventDefault();
      redo();
      return;
    }

    // Select All - select all text across all blocks
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      // Find the ScrollArea viewport (Radix component)
      const scrollViewport = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        const range = document.createRange();
        const allBlocks = scrollViewport.querySelectorAll('[contenteditable]');
        if (allBlocks.length > 0) {
          range.setStartBefore(allBlocks[0]);
          range.setEndAfter(allBlocks[allBlocks.length - 1]);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
      return;
    }

    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      moveBlock(id, e.key === 'ArrowUp' ? 'UP' : 'DOWN');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const current = blocksRef.current.find(b => b.id === id);
      const map: Record<BlockType, BlockType> = {
        [BlockType.SCENE_HEADING]: BlockType.ACTION,
        [BlockType.CHARACTER]: BlockType.DIALOGUE,
        [BlockType.DIALOGUE]: BlockType.CHARACTER,
        [BlockType.PARENTHETICAL]: BlockType.DIALOGUE,
        [BlockType.TRANSITION]: BlockType.SCENE_HEADING,
        [BlockType.SECTION]: BlockType.SCENE_HEADING,
        [BlockType.ACTION]: BlockType.ACTION
      };
      addBlock(id, current ? map[current.type] : BlockType.ACTION);
    } else if (e.key === 'Backspace') {
      const block = blocksRef.current.find(b => b.id === id);
      if (block?.content.replace(/<[^>]*>/g, '') === '') {
        e.preventDefault();
        deleteBlock(id);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const types = [BlockType.SCENE_HEADING, BlockType.ACTION, BlockType.CHARACTER, BlockType.DIALOGUE, BlockType.PARENTHETICAL, BlockType.TRANSITION, BlockType.SECTION];
      const current = blocksRef.current.find(b => b.id === id);
      if (current) {
        const idx = types.indexOf(current.type);
        const newIdx = e.shiftKey ? (idx - 1 + types.length) % types.length : (idx + 1) % types.length;
        changeBlockType(types[newIdx]);
      }
    }
  }, [addBlock, deleteBlock, moveBlock, changeBlockType, onSave, undo, redo]);

  // Handle multi-line paste - parse screenplay text and insert blocks
  const handlePasteMultiline = useCallback((blockId: string, text: string) => {
    // Parse the pasted text into screenplay blocks
    const parsedBlocks = plainTextToBlocks(text);

    if (parsedBlocks.length === 0) return;

    const revision = currentRevision.current;

    setHistoryState(prev => {
      const index = prev.blocks.findIndex(b => b.id === blockId);
      if (index === -1) return prev;

      // Apply revision color to all new blocks if active
      const blocksWithRevision = parsedBlocks.map(b => ({
        ...b,
        revision: revision !== RevisionColor.NONE ? revision : undefined
      }));

      // Insert new blocks after the current block
      const newBlocks = [
        ...prev.blocks.slice(0, index + 1),
        ...blocksWithRevision,
        ...prev.blocks.slice(index + 1)
      ];

      return { ...prev, blocks: newBlocks };
    });

    // Set active block to the last inserted block
    if (parsedBlocks.length > 0) {
      setActiveBlockId(parsedBlocks[parsedBlocks.length - 1].id);
    }
  }, [setHistoryState]);

  // Memoized page click handler
  const createPageClickHandler = useCallback((page: RenderedPage) => {
    return () => {
      if (page.blocks.length > 0) {
        setActiveBlockId(page.blocks[page.blocks.length - 1].id);
      }
    };
  }, []);

  // Handle title page metadata changes
  const handleTitlePageChange = useCallback((titlePage: TitlePageMetadata) => {
    setHistoryState(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        titlePage,
      },
    }));
    // Notify parent of metadata change
    onMetadataChange?.({
      ...metadata,
      titlePage,
    });
  }, [setHistoryState, metadata, onMetadataChange]);

  if (!mounted) {
    return (
      <div className="h-full bg-background flex items-center justify-center text-muted-foreground font-mono text-sm">
        Initializing Classic Editor...
      </div>
    );
  }

  return (
    <div className="relative flex h-full bg-background text-foreground overflow-hidden font-sans">
      {/* WORKSPACE */}
      <div className="flex-1 h-full">
        <div className="p-2 sm:p-4 md:p-8 flex flex-col items-center gap-4 sm:gap-8">
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              willChange: 'transform',
            }}
            className="flex flex-col gap-8"
          >
            {/* TITLE PAGE */}
            <TitlePage
              metadata={metadata.titlePage}
              onMetadataChange={handleTitlePageChange}
            />

            {/* SCRIPT PAGES */}
            {pages.map((page) => (
              <PageComponent
                key={page.pageNumber}
                page={page}
                activeBlockId={activeBlockId}
                onBlockClick={setActiveBlockId}
                onBlockChange={updateBlock}
                onKeyDown={handleKeyDown}
                onPageClick={createPageClickHandler(page)}
                onPasteMultiline={handlePasteMultiline}
              />
            ))}
          </div>
          <div className="h-64" />
        </div>
      </div>

      {/* Toolbar - centered within editor content area */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-50">
        <div className="pointer-events-auto">
          <Toolbar currentType={activeBlockType} onTypeChange={changeBlockType} />
        </div>
      </div>
    </div>
  );
}
