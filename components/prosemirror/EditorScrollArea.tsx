'use client';

import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';

// Export constant for use in FloatingToolbar and other components
export const EDITOR_SCROLLBAR_WIDTH = 8;

interface EditorScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Custom ScrollArea for the editor that exposes viewport ref for programmatic scrolling.
 * Unlike the standard shadcn ScrollArea, this forwards the ref to the Viewport element.
 */
export const EditorScrollArea = React.forwardRef<
  HTMLDivElement,
  EditorScrollAreaProps
>(({ children, className }, ref) => (
  <ScrollAreaPrimitive.Root className={cn('relative overflow-hidden bg-background', className)}>
    <ScrollAreaPrimitive.Viewport
      ref={ref}
      className="h-full w-full rounded-[inherit] bg-background"
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      orientation="vertical"
      className={cn(
        'flex touch-none select-none transition-colors duration-150',
        'h-full w-2 border-l border-l-transparent p-[1px]'
      )}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        className={cn(
          'relative flex-1 rounded-full',
          'bg-border hover:bg-muted-foreground/30',
          'transition-colors duration-150'
        )}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));

EditorScrollArea.displayName = 'EditorScrollArea';
