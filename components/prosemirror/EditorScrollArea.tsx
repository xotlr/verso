'use client';

import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Export constant for use in FloatingToolbar and other components
export const EDITOR_SCROLLBAR_WIDTH = 8;

interface EditorScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Custom ScrollArea for the editor that exposes viewport ref for programmatic scrolling.
 * Uses shadcn's ScrollBar for consistent styling, but forwards ref to Viewport element
 * (unlike standard shadcn ScrollArea which refs the Root).
 */
export const EditorScrollArea = React.forwardRef<
  HTMLDivElement,
  EditorScrollAreaProps
>(({ children, className }, ref) => (
  <ScrollAreaPrimitive.Root className={cn('relative overflow-hidden', className)}>
    <ScrollAreaPrimitive.Viewport
      ref={ref}
      className="h-full w-full rounded-[inherit]"
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));

EditorScrollArea.displayName = 'EditorScrollArea';
