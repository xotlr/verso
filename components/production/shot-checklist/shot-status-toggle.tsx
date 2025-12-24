"use client"

import { cn } from "@/lib/utils"
import { SHOT_STATUS_CONFIG, STATUS_ORDER, getNextStatus, type ShotStatus } from "@/types/production-tracking"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ShotStatusToggleProps {
  status: ShotStatus
  onStatusChange: (newStatus: ShotStatus) => void
  disabled?: boolean
  size?: "sm" | "md" | "lg"
}

export function ShotStatusToggle({
  status,
  onStatusChange,
  disabled = false,
  size = "md",
}: ShotStatusToggleProps) {
  const config = SHOT_STATUS_CONFIG[status]

  const sizeClasses = {
    sm: "h-6 w-6 text-sm",
    md: "h-8 w-8 text-base",
    lg: "h-10 w-10 text-lg",
  }

  const fontWeightClasses = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
  }

  const handleClick = () => {
    if (disabled) return
    const nextStatus = getNextStatus(status)
    onStatusChange(nextStatus)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={disabled}
            className={cn(
              sizeClasses[size],
              fontWeightClasses[config.weight],
              config.opacity,
              "rounded-full transition-all duration-200",
              "hover:bg-muted/80 active:scale-95",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label={`Status: ${config.label}. Click to advance.`}
          >
            <span className="select-none">{config.symbol}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{config.label}</p>
          {!disabled && status !== "approved" && (
            <p className="text-muted-foreground">Click to advance</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Compact inline status indicator (non-interactive)
interface StatusIndicatorProps {
  status: ShotStatus
  showLabel?: boolean
  size?: "sm" | "md"
}

export function StatusIndicator({ status, showLabel = false, size = "sm" }: StatusIndicatorProps) {
  const config = SHOT_STATUS_CONFIG[status]

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
  }

  const fontWeightClasses = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        sizeClasses[size],
        fontWeightClasses[config.weight],
        config.opacity
      )}
    >
      <span>{config.symbol}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

// Status progress dots showing all 4 states
interface StatusProgressProps {
  currentStatus: ShotStatus
}

export function StatusProgress({ currentStatus }: StatusProgressProps) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus)

  return (
    <div className="flex items-center gap-1">
      {STATUS_ORDER.map((status, index) => {
        const config = SHOT_STATUS_CONFIG[status]
        const isActive = index <= currentIndex
        const isCurrent = status === currentStatus

        return (
          <span
            key={status}
            className={cn(
              "text-xs transition-opacity",
              isActive ? config.opacity : "text-muted-foreground/30",
              isCurrent && "scale-110"
            )}
            title={config.label}
          >
            {config.symbol}
          </span>
        )
      })}
    </div>
  )
}
