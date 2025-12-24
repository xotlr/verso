'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Redo2, Settings, Maximize2, Minimize2, Play, History, Film, Users, Clapperboard } from 'lucide-react';
import { CiStickyNote } from 'react-icons/ci';
import { useEditorPanel, type EditorPanelType } from './EditorPanelContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarDivider } from './EditorToolbarContainer';
import { toolbarStyles } from './toolbar-styles';
import { ZoomDropdown } from './ZoomDropdown';
import { EditorSettingsPanel } from './EditorSettingsPanel';

interface EditorUnifiedToolbarProps {
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

  // Right side actions
  onToggleFocusMode: () => void;
  onTimelapse?: () => void;
  onVersionHistory?: () => void;

  // Activity bar counts
  scenesCount?: number;
  charactersCount?: number;
  shotlistCount?: number;
  notesCount?: number;

  // Focus mode state
  isInFocusMode?: boolean;

  // Layout
  className?: string;
}

/**
 * Unified floating toolbar for Inverso layout.
 * Combines all editor tools into a single horizontal bar (Google Docs style).
 *
 * Layout: [Undo] [Redo] | [Zoom] | --- spacer --- | [Focus] [Share] [Timelapse] [History] | [Settings]
 */
export function EditorUnifiedToolbar({
  zoom,
  fitToWidthScale,
  onZoomChange,
  onResetZoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onToggleFocusMode,
  onTimelapse,
  onVersionHistory,
  scenesCount = 0,
  charactersCount = 0,
  shotlistCount = 0,
  notesCount = 0,
  isInFocusMode = false,
  className,
}: EditorUnifiedToolbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { activePanel, setActivePanel } = useEditorPanel();

  // Handle panel button click - toggle if same panel, otherwise switch
  const handlePanelClick = (panel: EditorPanelType) => {
    setActivePanel(panel);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        className={cn(
          'fixed z-40',
          className
        )}
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        initial={false}
        animate={{
          top: isInFocusMode ? 16 : 80,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        <div
          className={cn(
            'flex items-center h-12',
            toolbarStyles.container.padding.horizontal,
            toolbarStyles.container.base,
            toolbarStyles.container.rounded
          )}
        >
          {/* Left group: Undo, Redo */}
          <ToolbarButton
            icon={<Undo2 className="h-4 w-4" />}
            label="Undo"
            onClick={onUndo}
            disabled={!canUndo}
            tooltipSide="bottom"
          />
          <ToolbarButton
            icon={<Redo2 className="h-4 w-4" />}
            label="Redo"
            onClick={onRedo}
            disabled={!canRedo}
            tooltipSide="bottom"
          />

          <ToolbarDivider orientation="horizontal" />

          {/* Zoom dropdown */}
          <ZoomDropdown
            zoom={zoom}
            fitToWidthScale={fitToWidthScale}
            onZoomChange={onZoomChange}
            onResetZoom={onResetZoom}
          />

          <ToolbarDivider orientation="horizontal" />

          {/* Right group: Focus, Timelapse, History */}
          <ToolbarButton
            icon={isInFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            label={isInFocusMode ? 'Exit focus mode' : 'Focus mode'}
            onClick={onToggleFocusMode}
            isActive={isInFocusMode}
            tooltipSide="bottom"
          />

          {onTimelapse && (
            <ToolbarButton
              icon={<Play className="h-4 w-4" />}
              label="View Timelapse"
              onClick={onTimelapse}
              tooltipSide="bottom"
            />
          )}

          {onVersionHistory && (
            <ToolbarButton
              icon={<History className="h-4 w-4" />}
              label="Version History"
              onClick={onVersionHistory}
              tooltipSide="bottom"
            />
          )}

          <ToolbarDivider orientation="horizontal" />

          {/* Activity Bar Items - Scenes, Characters, Shotlist, Notes */}
          <ToolbarButton
            icon={<Film className="h-4 w-4" />}
            label={`Scenes${scenesCount > 0 ? ` (${scenesCount})` : ''}`}
            onClick={() => handlePanelClick('scenes')}
            isActive={activePanel === 'scenes'}
            tooltipSide="bottom"
          />
          <ToolbarButton
            icon={<Users className="h-4 w-4" />}
            label={`Characters${charactersCount > 0 ? ` (${charactersCount})` : ''}`}
            onClick={() => handlePanelClick('characters')}
            isActive={activePanel === 'characters'}
            tooltipSide="bottom"
          />
          <ToolbarButton
            icon={<Clapperboard className="h-4 w-4" />}
            label={`Shotlist${shotlistCount > 0 ? ` (${shotlistCount})` : ''}`}
            onClick={() => handlePanelClick('shotlist')}
            isActive={activePanel === 'shotlist'}
            tooltipSide="bottom"
          />
          <ToolbarButton
            icon={<CiStickyNote className="h-4 w-4" />}
            label={`Notes${notesCount > 0 ? ` (${notesCount})` : ''}`}
            onClick={() => handlePanelClick('notes')}
            isActive={activePanel === 'notes'}
            tooltipSide="bottom"
          />

          <ToolbarDivider orientation="horizontal" />

          {/* Settings */}
          <ToolbarButton
            icon={<Settings className="h-4 w-4" />}
            label="Editor Settings"
            onClick={() => setSettingsOpen(true)}
            tooltipSide="bottom"
          />
        </div>

      </motion.div>

      {/* Settings Panel - uses fixed positioning in 'below' mode */}
      <AnimatePresence>
        {settingsOpen && (
          <EditorSettingsPanel
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            position="below"
          />
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
