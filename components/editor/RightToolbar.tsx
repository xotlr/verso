'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EditorToolbarContainer } from './EditorToolbarContainer';
import { ToolbarButton } from './ToolbarButton';

interface RightToolbarProps {
  // Focus mode
  onToggleFocusMode: () => void;

  // Focus mode state (for styling)
  isInFocusMode?: boolean;

  // Layout
  className?: string;
}

/**
 * Right-side floating toolbar.
 * Contains: Focus mode toggle only.
 * Timelapse and Version History buttons moved to header.
 */
export function RightToolbar({
  onToggleFocusMode,
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
        </EditorToolbarContainer>
      </motion.div>
    </TooltipProvider>
  );
}
