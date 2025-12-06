import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  [
    "flex h-10 w-full px-3 py-2 text-sm text-foreground",
    "border-2 bg-muted/50",
    "placeholder:text-muted-foreground/60",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
    "transition-all duration-[1200ms] ease-[cubic-bezier(0.08,0.82,0.17,1)]",
  ],
  {
    variants: {
      variant: {
        default: [
          "rounded-lg border-border/60",
          "hover:border-border/80 hover:bg-muted/60",
          "focus:outline-none focus:ring-[1.5px] focus:ring-ring/15 focus:border-ring/60 focus:bg-muted/45",
        ],
        pill: [
          "rounded-full border-border/50",
          "hover:border-border/70 hover:bg-muted/60",
          "focus:outline-none focus:ring-[1.5px] focus:ring-ring/15 focus:border-ring/60 focus:bg-muted/45",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface InputProps
  extends React.ComponentProps<"input">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
