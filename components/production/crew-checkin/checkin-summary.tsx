"use client"

import { Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckinSummaryProps {
  checked: number
  total: number
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  className?: string
}

export function CheckinSummary({
  checked,
  total,
  size = "md",
  showIcon = true,
  className,
}: CheckinSummaryProps) {
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0
  const allChecked = checked === total && total > 0

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && (
        <Users
          className={cn(
            "text-muted-foreground",
            size === "sm" && "h-3 w-3",
            size === "md" && "h-4 w-4",
            size === "lg" && "h-5 w-5"
          )}
        />
      )}
      <span
        className={cn(
          "tabular-nums",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          size === "lg" && "text-base font-medium",
          allChecked ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {checked}/{total}
      </span>
      {size === "lg" && (
        <span className="text-muted-foreground text-sm">({percent}%)</span>
      )}
    </div>
  )
}
