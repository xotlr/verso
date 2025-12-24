"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { type ShotStatus } from "@/types/production-tracking"
import { ShotChecklistItem } from "./shot-checklist-item"
import { StatusProgress } from "./shot-status-toggle"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"

interface Shot {
  id: string
  shotNumber: number
  description: string
  shotType?: string | null
  cameraAngle?: string | null
  status: string
  takeCount: number
  circledTake?: number | null
  quickNotes?: string | null
  // Script supervisor fields
  lineReading?: string | null
  continuityNotes?: string | null
  isFlagged?: boolean
}

interface ShotChecklistSceneProps {
  sceneHeading: string
  sceneNumber: number
  shots: Shot[]
  onStatusChange: (shotId: string, status: ShotStatus) => Promise<void>
  onTakeChange: (shotId: string, takeCount: number, circledTake?: number | null) => Promise<void>
  onNotesChange: (shotId: string, notes: string) => Promise<void>
  onSupervisorChange?: (shotId: string, updates: {
    lineReading?: string | null
    continuityNotes?: string | null
    isFlagged?: boolean
  }) => Promise<void>
  isUpdating?: boolean
  defaultExpanded?: boolean
}

export function ShotChecklistScene({
  sceneHeading,
  sceneNumber,
  shots,
  onStatusChange,
  onTakeChange,
  onNotesChange,
  onSupervisorChange,
  isUpdating = false,
  defaultExpanded = true,
}: ShotChecklistSceneProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Calculate scene progress
  const totalShots = shots.length
  const completedShots = shots.filter(
    (s) => s.status === "shot" || s.status === "approved"
  ).length
  const approvedShots = shots.filter((s) => s.status === "approved").length

  // Get dominant status for progress indicator
  const getDominantStatus = (): ShotStatus => {
    if (approvedShots === totalShots) return "approved"
    if (completedShots === totalShots) return "shot"
    const setupShots = shots.filter((s) => s.status === "setup").length
    if (setupShots > 0 || completedShots > 0) return "setup"
    return "planned"
  }

  return (
    <div className="border border-border/50 rounded-lg bg-card/50 overflow-hidden">
      {/* Scene header */}
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-3 p-4 h-auto justify-start",
          "hover:bg-muted/50 rounded-none"
        )}
      >
        {/* Expand icon */}
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}

        {/* Scene number */}
        <span className="text-sm font-medium text-muted-foreground w-8">
          {sceneNumber}
        </span>

        {/* Scene heading */}
        <span className="flex-1 text-left text-sm font-medium truncate">
          {sceneHeading}
        </span>

        {/* Progress */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusProgress currentStatus={getDominantStatus()} />
          <span className="text-xs text-muted-foreground tabular-nums">
            {completedShots}/{totalShots}
          </span>
        </div>
      </Button>

      {/* Shots list */}
      {isExpanded && shots.length > 0 && (
        <div className="p-3 pt-0 space-y-2">
          {shots.map((shot) => (
            <ShotChecklistItem
              key={shot.id}
              shot={shot}
              onStatusChange={onStatusChange}
              onTakeChange={onTakeChange}
              onNotesChange={onNotesChange}
              onSupervisorChange={onSupervisorChange}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isExpanded && shots.length === 0 && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No shots for this scene
        </div>
      )}
    </div>
  )
}
