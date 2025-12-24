"use client"

import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ContinuityFlagsProps {
  isFlagged: boolean
  hasNotes: boolean
  size?: "sm" | "md"
  className?: string
}

export function ContinuityFlags({
  isFlagged,
  hasNotes,
  size = "md",
  className,
}: ContinuityFlagsProps) {
  if (!isFlagged && !hasNotes) return null

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {isFlagged && (
        <div
          className={cn(
            "flex items-center justify-center rounded",
            size === "sm" ? "w-4 h-4" : "w-5 h-5"
          )}
          title="Continuity concern flagged"
        >
          <AlertTriangle
            className={cn(
              "text-foreground",
              size === "sm" ? "h-3 w-3" : "h-4 w-4"
            )}
          />
        </div>
      )}
      {hasNotes && !isFlagged && (
        <span
          className={cn(
            "text-muted-foreground",
            size === "sm" ? "text-xs" : "text-sm"
          )}
          title="Has supervisor notes"
        >
          ●
        </span>
      )}
    </div>
  )
}

interface ContinuityFlagToggleProps {
  isFlagged: boolean
  onChange: (flagged: boolean) => void
  disabled?: boolean
  className?: string
}

export function ContinuityFlagToggle({
  isFlagged,
  onChange,
  disabled = false,
  className,
}: ContinuityFlagToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!isFlagged)}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded transition-colors",
        "hover:bg-muted/50",
        isFlagged ? "text-foreground" : "text-muted-foreground/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      title={isFlagged ? "Remove continuity flag" : "Flag for continuity concern"}
    >
      <AlertTriangle className="h-4 w-4" />
      <span className="text-xs">
        {isFlagged ? "Flagged" : "Flag"}
      </span>
    </button>
  )
}
