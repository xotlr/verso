'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Undo2,
  Redo2,
  Settings,
  Maximize2,
  Minimize2,
  BookOpen,
  Pencil,
  Highlighter,
  Eraser,
  Gauge,
} from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EditorToolbarContainer, ToolbarDivider } from './EditorToolbarContainer';
import { ToolbarButton } from './ToolbarButton';
import { ZoomSlider } from './ZoomSlider';
import { EditorSettingsPanel } from './EditorSettingsPanel';
import type { HighlightColor } from '@/types/settings';

// Highlight color swatches - Procreate style
const HIGHLIGHT_COLORS: { color: HighlightColor; bg: string; label: string }[] = [
  { color: 'yellow', bg: 'bg-yellow-300', label: 'Yellow' },
  { color: 'green', bg: 'bg-green-300', label: 'Green' },
  { color: 'blue', bg: 'bg-blue-300', label: 'Blue' },
  { color: 'pink', bg: 'bg-pink-300', label: 'Pink' },
  { color: 'orange', bg: 'bg-orange-300', label: 'Orange' },
];

interface RightToolbarProps {
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
  onToggleFocusMode?: () => void;

  // Reading mode
  isInReadingMode?: boolean;
  onToggleReadingMode?: () => void;

  // Highlight
  isHighlightActive?: boolean;
  highlightColor?: HighlightColor;
  onHighlightToggle?: () => void;
  onHighlightColorChange?: (color: HighlightColor) => void;

  // Eraser
  isEraserActive?: boolean;
  onEraserToggle?: () => void;

  // Script Check
  onScriptCheck?: () => void;

  // Layout
  className?: string;
}

/**
 * Right-side Procreate-style toolbar.
 * Contains: Undo, Redo, Focus, Reading, Highlight, Eraser, Zoom slider, Settings
 */
export function RightToolbar({
  zoom,
  fitToWidthScale,
  onZoomChange,
  onResetZoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isInFocusMode = false,
  onToggleFocusMode,
  isInReadingMode = false,
  onToggleReadingMode,
  isHighlightActive = false,
  highlightColor = 'yellow',
  onHighlightToggle,
  onHighlightColorChange,
  isEraserActive = false,
  onEraserToggle,
  onScriptCheck,
  className,
}: RightToolbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showHighlightColors, setShowHighlightColors] = useState(false);

  const handleHighlightClick = () => {
    if (isHighlightActive) {
      onHighlightToggle?.();
    } else {
      setShowHighlightColors(!showHighlightColors);
    }
  };

  const handleSelectHighlightColor = (color: HighlightColor) => {
    onHighlightColorChange?.(color);
    if (!isHighlightActive) {
      onHighlightToggle?.();
    }
    setShowHighlightColors(false);
  };

  const currentHighlight = HIGHLIGHT_COLORS.find(h => h.color === highlightColor) || HIGHLIGHT_COLORS[0];

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        className={cn(
          'fixed z-40 top-1/2 -translate-y-1/2 right-4',
          className
        )}
        initial={false}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        <EditorToolbarContainer orientation="vertical" className="w-12">
          {/* Focus mode button */}
          {onToggleFocusMode && (
            <ToolbarButton
              icon={isInFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              label={isInFocusMode ? 'Exit focus mode' : 'Focus mode'}
              onClick={onToggleFocusMode}
              tooltipSide="left"
            />
          )}

          {/* Reading mode button */}
          {onToggleReadingMode && (
            <ToolbarButton
              icon={isInReadingMode ? <Pencil className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
              label={isInReadingMode ? 'Edit mode' : 'Reading mode'}
              onClick={onToggleReadingMode}
              isActive={isInReadingMode}
              tooltipSide="left"
            />
          )}

          <ToolbarDivider orientation="vertical" />

          {/* Highlight button with color picker */}
          {onHighlightToggle && (
            <div className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleHighlightClick}
                    className={cn(
                      'flex items-center justify-center rounded-lg transition-all duration-150',
                      'h-9 w-9',
                      isHighlightActive || showHighlightColors
                        ? 'text-foreground bg-accent/60'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                  >
                    <div className="relative">
                      <Highlighter className="h-4 w-4" />
                      <div
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-background',
                          currentHighlight.bg,
                          isHighlightActive && 'ring-1 ring-primary'
                        )}
                      />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {isHighlightActive ? 'Highlighting on' : 'Highlight'}
                </TooltipContent>
              </Tooltip>

              {/* Highlight color picker flyout */}
              <AnimatePresence>
                {showHighlightColors && (
                  <motion.div
                    className="absolute right-12 top-0 flex gap-1 p-1.5 bg-background border border-border/40 rounded-lg shadow-lg"
                    initial={{ opacity: 0, x: 8, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 8, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    onMouseLeave={() => setShowHighlightColors(false)}
                  >
                    {HIGHLIGHT_COLORS.map((highlight) => (
                      <Tooltip key={highlight.color}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleSelectHighlightColor(highlight.color)}
                            className={cn(
                              'size-6 rounded-md border-2 transition-all duration-100',
                              highlight.bg,
                              highlightColor === highlight.color && isHighlightActive
                                ? 'border-primary scale-110'
                                : 'border-border/30 hover:border-border hover:scale-105'
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {highlight.label}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Eraser button */}
          {onEraserToggle && (
            <ToolbarButton
              icon={<Eraser className="h-4 w-4" />}
              label={isEraserActive ? 'Eraser on' : 'Remove highlights'}
              onClick={onEraserToggle}
              isActive={isEraserActive}
              tooltipSide="left"
            />
          )}

          {/* Script Check button */}
          {onScriptCheck && (
            <ToolbarButton
              icon={<Gauge className="h-4 w-4" />}
              label="Script Check"
              onClick={onScriptCheck}
              tooltipSide="left"
            />
          )}

          <ToolbarDivider orientation="vertical" />

          {/* Zoom slider */}
          <ZoomSlider
            zoom={zoom}
            fitToWidthScale={fitToWidthScale}
            onZoomChange={onZoomChange}
            onResetZoom={onResetZoom}
          />

          <ToolbarDivider orientation="vertical" />

          {/* Undo button */}
          <ToolbarButton
            icon={<Undo2 className="h-4 w-4" />}
            label="Undo"
            onClick={onUndo}
            disabled={!canUndo}
            tooltipSide="left"
          />

          {/* Redo button */}
          <ToolbarButton
            icon={<Redo2 className="h-4 w-4" />}
            label="Redo"
            onClick={onRedo}
            disabled={!canRedo}
            tooltipSide="left"
          />

          <ToolbarDivider orientation="vertical" />

          {/* Settings button */}
          <ToolbarButton
            icon={<Settings className="h-4 w-4" />}
            label="Editor Settings"
            onClick={() => setSettingsOpen(true)}
            tooltipSide="left"
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
