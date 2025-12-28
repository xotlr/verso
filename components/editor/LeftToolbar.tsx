'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Redo2, Settings } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EditorToolbarContainer, ToolbarDivider } from './EditorToolbarContainer';
import { ToolbarButton } from './ToolbarButton';
import { ZoomSlider } from './ZoomSlider';
import { EditorSettingsPanel } from './EditorSettingsPanel';

interface LeftToolbarProps {
  // Zoom props
  zoom: number;
  fitToWidthScale: number;
  onZoomChange: (zoom: number) => void;
  onResetZoom: () => void;

  // Undo/Redo props
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;

  // Focus mode
  isInFocusMode?: boolean;

  // Layout
  className?: string;
}

/**
 * Left-side Procreate-style toolbar.
 * Contains: Undo, Redo, Zoom slider, Settings
 */
export function LeftToolbar({
  zoom,
  fitToWidthScale,
  onZoomChange,
  onResetZoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isInFocusMode = false,
  className,
}: LeftToolbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        className={cn(
          'fixed z-40 top-1/2 -translate-y-1/2 transition-[left] duration-500 ease-out',
          className
        )}
        style={{
          left: isInFocusMode ? 12 : 'calc(var(--sidebar-width) + 12px)',
        }}
        initial={false}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        <EditorToolbarContainer orientation="vertical" className="w-12">
          {/* Undo button */}
          <ToolbarButton
            icon={<Undo2 className="h-4 w-4" />}
            label="Undo"
            onClick={onUndo}
            disabled={!canUndo}
            tooltipSide="right"
          />

          {/* Redo button */}
          <ToolbarButton
            icon={<Redo2 className="h-4 w-4" />}
            label="Redo"
            onClick={onRedo}
            disabled={!canRedo}
            tooltipSide="right"
          />

          <ToolbarDivider orientation="vertical" />

          {/* Zoom slider */}
          <ZoomSlider
            zoom={zoom}
            fitToWidthScale={fitToWidthScale}
            onZoomChange={onZoomChange}
            onResetZoom={onResetZoom}
          />

          <ToolbarDivider orientation="vertical" />

          {/* Settings button */}
          <ToolbarButton
            icon={<Settings className="h-4 w-4" />}
            label="Editor Settings"
            onClick={() => setSettingsOpen(true)}
            tooltipSide="right"
          />
        </EditorToolbarContainer>

        {/* Settings Panel */}
        <AnimatePresence>
          {settingsOpen && (
            <EditorSettingsPanel
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  );
}
