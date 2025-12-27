import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border-2 border-border/60 bg-muted/50 px-3 py-2 text-base placeholder:text-muted-foreground/60 transition-all duration-[1200ms] ease-[cubic-bezier(0.08,0.82,0.17,1)] hover:border-border/80 hover:bg-muted/60 focus:outline-none focus:ring-[1.5px] focus:ring-ring/15 focus:border-ring/60 focus:bg-muted/45 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
