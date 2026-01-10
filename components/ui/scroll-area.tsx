import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  /** Ref to the scrollable viewport element - useful for virtualization */
  viewportRef?: React.Ref<HTMLDivElement>;
  /** Additional className for the viewport */
  viewportClassName?: string;
  /** Add fade effect at edges - true for both, or 'top'/'bottom' for one side */
  fadeEdges?: boolean | 'top' | 'bottom';
  /** Height of the fade gradient (default: 2rem) */
  fadeHeight?: string;
}

/** Generate CSS mask for fade edges effect */
function getFadeMaskStyle(
  fadeEdges: boolean | 'top' | 'bottom' | undefined,
  fadeHeight: string = '2rem'
): React.CSSProperties {
  if (!fadeEdges) return {};

  const fadeTop = fadeEdges === true || fadeEdges === 'top';
  const fadeBottom = fadeEdges === true || fadeEdges === 'bottom';

  const gradient = `linear-gradient(to bottom, ${fadeTop ? 'transparent' : 'black'} 0%, black ${fadeTop ? fadeHeight : '0'}, black calc(100% - ${fadeBottom ? fadeHeight : '0'}), ${fadeBottom ? 'transparent' : 'black'} 100%)`;

  return {
    maskImage: gradient,
    WebkitMaskImage: gradient,
  };
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, viewportRef, viewportClassName, fadeEdges, fadeHeight, ...props }, ref) => {
  const fadeMaskStyle = React.useMemo(
    () => getFadeMaskStyle(fadeEdges, fadeHeight),
    [fadeEdges, fadeHeight]
  );

  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      type="always"
      scrollHideDelay={0}
      className={cn("relative overflow-hidden min-h-0", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        className={cn("h-full w-full rounded-[inherit] [&>div]:!block", viewportClassName)}
        style={fadeMaskStyle}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
})
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors duration-150",
      orientation === "vertical" &&
        "h-full w-2 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      className={cn(
        "relative flex-1 rounded-full",
        "bg-muted-foreground/30 hover:bg-muted-foreground/50",
        "transition-colors duration-150",
        "min-h-[30px]"
      )}
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
