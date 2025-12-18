'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Share2, Play, History } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EditorToolbarContainer } from './EditorToolbarContainer';
import { ToolbarButton } from './ToolbarButton';

interface RightToolbarProps {
  // Focus mode
  onToggleFocusMode: () => void;

  // Share
  onShare?: () => void;

  // Timelapse
  onTimelapse?: () => void;

  // Version History
  onVersionHistory?: () => void;

  // Focus mode state (for styling)
  isInFocusMode?: boolean;

  // Layout
  className?: string;
}

/**
 * Right-side Procreate-style toolbar.
 * Contains: Focus mode toggle, Share button, Timelapse button
 */
export function RightToolbar({
  onToggleFocusMode,
  onShare,
  onTimelapse,
  onVersionHistory,
  isInFocusMode = false,
  className,
}: RightToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        className={cn(
          'fixed right-4 z-40',
          className
        )}
        initial={false}
        animate={{
          top: isInFocusMode ? 16 : 80, // 80px = top-20, 16px = top-4
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        <EditorToolbarContainer orientation="horizontal" className="h-12">
          {/* Focus mode toggle */}
          <ToolbarButton
            icon={isInFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            label={isInFocusMode ? 'Exit focus mode' : 'Focus mode'}
            onClick={onToggleFocusMode}
            isActive={isInFocusMode}
            tooltipSide="bottom"
          />

          {/* Share button (conditional) */}
          {onShare && (
            <ToolbarButton
              icon={<Share2 className="h-4 w-4" />}
              label="Share"
              onClick={onShare}
              tooltipSide="bottom"
            />
          )}

          {/* Timelapse button (conditional) */}
          {onTimelapse && (
            <ToolbarButton
              icon={<Play className="h-4 w-4" />}
              label="View Timelapse"
              onClick={onTimelapse}
              tooltipSide="bottom"
            />
          )}

          {/* Version History button (conditional) */}
          {onVersionHistory && (
            <ToolbarButton
              icon={<History className="h-4 w-4" />}
              label="Version History"
              onClick={onVersionHistory}
              tooltipSide="bottom"
            />
          )}
        </EditorToolbarContainer>
      </motion.div>
    </TooltipProvider>
  );
}
