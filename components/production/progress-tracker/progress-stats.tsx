"use client"

import { cn } from "@/lib/utils"
import { SHOT_STATUS_CONFIG, type ShotStatus } from "@/types/production-tracking"

interface ProgressStatsProps {
  planned: number
  setup: number
  shot: number
  approved: number
  layout?: "horizontal" | "vertical" | "grid"
  size?: "sm" | "md" | "lg"
}

export function ProgressStats({
  planned,
  setup,
  shot,
  approved,
  layout = "horizontal",
  size = "md",
}: ProgressStatsProps) {
  const stats = [
    { status: "planned" as ShotStatus, count: planned },
    { status: "setup" as ShotStatus, count: setup },
    { status: "shot" as ShotStatus, count: shot },
    { status: "approved" as ShotStatus, count: approved },
  ]

  const sizeClasses = {
    sm: { symbol: "text-sm", count: "text-xs", label: "text-[10px]" },
    md: { symbol: "text-base", count: "text-sm", label: "text-xs" },
    lg: { symbol: "text-lg", count: "text-base", label: "text-sm" },
  }

  const layoutClasses = {
    horizontal: "flex items-center gap-4",
    vertical: "flex flex-col gap-2",
    grid: "grid grid-cols-2 gap-3",
  }

  return (
    <div className={cn(layoutClasses[layout])}>
      {stats.map(({ status, count }) => {
        const config = SHOT_STATUS_CONFIG[status]
        return (
          <div
            key={status}
            className={cn(
              "flex items-center gap-2",
              layout === "vertical" && "justify-between"
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className={cn(sizeClasses[size].symbol, config.opacity)}>
                {config.symbol}
              </span>
              <span className={cn(sizeClasses[size].label, "text-muted-foreground")}>
                {config.label}
              </span>
            </div>
            <span className={cn(sizeClasses[size].count, "tabular-nums font-medium")}>
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Compact summary showing just completed/total
interface ProgressSummaryProps {
  completed: number
  total: number
  size?: "sm" | "md" | "lg"
  showPercent?: boolean
}

export function ProgressSummary({
  completed,
  total,
  size = "md",
  showPercent = true,
}: ProgressSummaryProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  return (
    <div className={cn("flex items-baseline gap-1", sizeClasses[size])}>
      <span className="font-semibold tabular-nums">{completed}</span>
      <span className="text-muted-foreground">/</span>
      <span className="text-muted-foreground tabular-nums">{total}</span>
      {showPercent && (
        <span className="text-muted-foreground ml-1">({percent}%)</span>
      )}
    </div>
  )
}
