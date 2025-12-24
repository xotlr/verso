"use client"

import { cn } from "@/lib/utils"

interface ProgressBarSimpleProps {
  percent: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

export function ProgressBarSimple({
  percent,
  size = "md",
  showLabel = false,
  className,
}: ProgressBarSimpleProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent))

  const heightClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex-1 bg-muted rounded-full overflow-hidden",
          heightClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            // Warm gray gradient for progress - no saturated colors
            clampedPercent === 100
              ? "bg-foreground/60"
              : "bg-foreground/30"
          )}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm tabular-nums text-muted-foreground min-w-[3rem] text-right">
          {clampedPercent}%
        </span>
      )}
    </div>
  )
}

// Segmented progress showing each status
interface ProgressBarSegmentedProps {
  planned: number
  setup: number
  shot: number
  approved: number
  total: number
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ProgressBarSegmented({
  planned,
  setup,
  shot,
  approved,
  total,
  size = "md",
  className,
}: ProgressBarSegmentedProps) {
  if (total === 0) return null

  const segments = [
    { count: approved, opacity: "bg-foreground/60" },
    { count: shot, opacity: "bg-foreground/40" },
    { count: setup, opacity: "bg-foreground/20" },
    { count: planned, opacity: "bg-muted-foreground/20" },
  ]

  const heightClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  }

  return (
    <div
      className={cn(
        "flex bg-muted rounded-full overflow-hidden",
        heightClasses[size],
        className
      )}
    >
      {segments.map((segment, index) => {
        if (segment.count === 0) return null
        const width = (segment.count / total) * 100
        return (
          <div
            key={index}
            className={cn("h-full transition-all duration-500", segment.opacity)}
            style={{ width: `${width}%` }}
          />
        )
      })}
    </div>
  )
}
