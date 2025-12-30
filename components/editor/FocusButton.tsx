'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, BookOpen, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FocusButtonProps {
  onToggleFocusMode: () => void;
  isInFocusMode?: boolean;
  onToggleReadingMode?: () => void;
  isInReadingMode?: boolean;
  className?: string;
}

/**
 * Standalone floating focus mode button with optional reading mode toggle.
 * Positioned on the left side of the editor, aligned with LeftToolbar buttons.
 */
export function FocusButton({
  onToggleFocusMode,
  isInFocusMode = false,
  onToggleReadingMode,
  isInReadingMode = false,
  className,
}: FocusButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        className={cn(
          'fixed z-40 transition-[left] duration-500 ease-out flex flex-col gap-1',
          className
        )}
        style={{
          // Align with center of LeftToolbar (48px wide container, center offset = 24px - 16px = 8px)
          left: isInFocusMode ? 20 : 'calc(var(--sidebar-width) + 20px)',
        }}
        initial={false}
        animate={{
          top: isInFocusMode ? 16 : 56,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        {/* Focus mode button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleFocusMode}
              className={cn(
                'flex items-center justify-center rounded-lg transition-all duration-150',
                'size-8',
                'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            >
              {isInFocusMode ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isInFocusMode ? 'Exit focus mode' : 'Focus mode'}
          </TooltipContent>
        </Tooltip>

        {/* Reading mode button */}
        {onToggleReadingMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleReadingMode}
                className={cn(
                  'flex items-center justify-center rounded-lg transition-all duration-150',
                  'size-8',
                  isInReadingMode
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {isInReadingMode ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isInReadingMode ? 'Edit mode' : 'Reading mode'}
            </TooltipContent>
          </Tooltip>
        )}
      </motion.div>
    </TooltipProvider>
  );
}
