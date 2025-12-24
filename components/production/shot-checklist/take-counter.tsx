"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"

interface TakeCounterProps {
  count: number
  circledTake?: number | null
  onCountChange: (newCount: number) => void
  onCircledChange?: (take: number | null) => void
  disabled?: boolean
  compact?: boolean
}

export function TakeCounter({
  count,
  circledTake,
  onCountChange,
  onCircledChange,
  disabled = false,
  compact = false,
}: TakeCounterProps) {
  const handleIncrement = () => {
    if (disabled) return
    onCountChange(count + 1)
  }

  const handleDecrement = () => {
    if (disabled || count <= 0) return
    onCountChange(count - 1)
    // If circled take is now invalid, clear it
    if (circledTake && circledTake > count - 1) {
      onCircledChange?.(null)
    }
  }

  const handleCircle = () => {
    if (disabled || count === 0) return
    // Toggle circle on current take count
    if (circledTake === count) {
      onCircledChange?.(null)
    } else {
      onCircledChange?.(count)
    }
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDecrement}
          disabled={disabled || count <= 0}
          className="h-6 w-6"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span
          className={cn(
            "min-w-[2rem] text-center text-sm tabular-nums",
            count === 0 && "text-muted-foreground"
          )}
        >
          {count}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleIncrement}
          disabled={disabled}
          className="h-6 w-6"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-10">Takes</span>
        <div className="inline-flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            disabled={disabled || count <= 0}
            className="h-7 w-7 border-border/60"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span
            className={cn(
              "min-w-[2.5rem] text-center font-medium tabular-nums",
              count === 0 && "text-muted-foreground"
            )}
          >
            {count}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleIncrement}
            disabled={disabled}
            className="h-7 w-7 border-border/60"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {count > 0 && onCircledChange && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10">Circle</span>
          <Button
            variant={circledTake ? "default" : "outline"}
            size="sm"
            onClick={handleCircle}
            disabled={disabled}
            className={cn(
              "h-7 px-3 text-xs border-border/60",
              circledTake && "bg-primary/10 text-primary border-primary/20"
            )}
          >
            {circledTake ? `Take ${circledTake}` : "None"}
          </Button>
        </div>
      )}
    </div>
  )
}
