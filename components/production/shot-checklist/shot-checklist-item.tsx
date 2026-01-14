"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { type ShotStatus } from "@/types/production-tracking"
import { ShotStatusToggle } from "./shot-status-toggle"
import { TakeCounter } from "./take-counter"
import { ContinuityFlagToggle } from "../script-supervisor/continuity-flags"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, ChevronUp, MessageSquare, AlertTriangle } from "lucide-react"
import { SHOT_TYPE_LABELS, CAMERA_ANGLE_LABELS, type ShotType, type CameraAngle } from "@/types/shotlist"

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

interface ShotChecklistItemProps {
  shot: Shot
  onStatusChange: (shotId: string, status: ShotStatus) => Promise<void>
  onTakeChange: (shotId: string, takeCount: number, circledTake?: number | null) => Promise<void>
  onNotesChange: (shotId: string, notes: string) => Promise<void>
  onSupervisorChange?: (shotId: string, updates: {
    lineReading?: string | null
    continuityNotes?: string | null
    isFlagged?: boolean
  }) => Promise<void>
  isUpdating?: boolean
}

export function ShotChecklistItem({
  shot,
  onStatusChange,
  onTakeChange,
  onNotesChange,
  onSupervisorChange,
  isUpdating = false,
}: ShotChecklistItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localNotes, setLocalNotes] = useState(shot.quickNotes || "")
  const [hasNotesChanged, setHasNotesChanged] = useState(false)

  // Script supervisor local state
  const [localLineReading, setLocalLineReading] = useState(shot.lineReading || "")
  const [localContinuityNotes, setLocalContinuityNotes] = useState(shot.continuityNotes || "")
  const [hasLineReadingChanged, setHasLineReadingChanged] = useState(false)
  const [hasContinuityChanged, setHasContinuityChanged] = useState(false)

  const status = shot.status as ShotStatus
  const shotTypeLabel = shot.shotType ? SHOT_TYPE_LABELS[shot.shotType as ShotType] : null
  const angleLabel = shot.cameraAngle ? CAMERA_ANGLE_LABELS[shot.cameraAngle as CameraAngle] : null

  const handleNotesBlur = () => {
    if (hasNotesChanged && localNotes !== shot.quickNotes) {
      onNotesChange(shot.id, localNotes)
      setHasNotesChanged(false)
    }
  }

  const handleLineReadingBlur = () => {
    if (hasLineReadingChanged && localLineReading !== shot.lineReading && onSupervisorChange) {
      onSupervisorChange(shot.id, { lineReading: localLineReading || null })
      setHasLineReadingChanged(false)
    }
  }

  const handleContinuityBlur = () => {
    if (hasContinuityChanged && localContinuityNotes !== shot.continuityNotes && onSupervisorChange) {
      onSupervisorChange(shot.id, { continuityNotes: localContinuityNotes || null })
      setHasContinuityChanged(false)
    }
  }

  const handleFlagToggle = (flagged: boolean) => {
    if (onSupervisorChange) {
      onSupervisorChange(shot.id, { isFlagged: flagged })
    }
  }

  return (
    <div
      className={cn(
        "group border border-border/50 rounded-lg bg-card",
        "transition-all duration-200",
        isExpanded && "shadow-sm"
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Status toggle */}
        <ShotStatusToggle
          status={status}
          onStatusChange={(newStatus) => onStatusChange(shot.id, newStatus)}
          disabled={isUpdating}
          size="md"
        />

        {/* Shot number */}
        <div className="flex-shrink-0 w-8 text-center">
          <span className="text-sm font-medium text-muted-foreground">
            {shot.shotNumber}
          </span>
        </div>

        {/* Description */}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{shot.description}</p>
          {(shotTypeLabel || angleLabel) && (
            <p className="text-xs text-muted-foreground truncate">
              {[shotTypeLabel, angleLabel].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Take counter (compact) */}
        <div className="flex-shrink-0">
          <TakeCounter
            count={shot.takeCount}
            circledTake={shot.circledTake}
            onCountChange={(count) => onTakeChange(shot.id, count, shot.circledTake)}
            onCircledChange={(circled) => onTakeChange(shot.id, shot.takeCount, circled)}
            disabled={isUpdating}
            compact
          />
        </div>

        {/* Indicators & expand toggle */}
        <div className="flex items-center gap-1">
          {shot.isFlagged && (
            <span title="Continuity flagged">
              <AlertTriangle className="h-3.5 w-3.5 text-foreground" />
            </span>
          )}
          {shot.quickNotes && (
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded section */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border/30">
          <div className="pt-3 space-y-3">
            {/* Full take counter */}
            <TakeCounter
              count={shot.takeCount}
              circledTake={shot.circledTake}
              onCountChange={(count) => onTakeChange(shot.id, count, shot.circledTake)}
              onCircledChange={(circled) => onTakeChange(shot.id, shot.takeCount, circled)}
              disabled={isUpdating}
            />

            {/* Quick notes */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Quick Notes</label>
              <Textarea
                value={localNotes}
                onChange={(e) => {
                  setLocalNotes(e.target.value)
                  setHasNotesChanged(true)
                }}
                onBlur={handleNotesBlur}
                placeholder="Add notes..."
                className="min-h-[60px] text-sm resize-none border-border/60"
                disabled={isUpdating}
              />
            </div>

            {/* Script Supervisor Section */}
            {onSupervisorChange && (
              <div className="pt-3 border-t border-border/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="section-label">
                    Script Supervisor
                  </span>
                  <ContinuityFlagToggle
                    isFlagged={shot.isFlagged || false}
                    onChange={handleFlagToggle}
                    disabled={isUpdating}
                  />
                </div>

                {/* Line Reading */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Line Reading</label>
                  <Input
                    value={localLineReading}
                    onChange={(e) => {
                      setLocalLineReading(e.target.value)
                      setHasLineReadingChanged(true)
                    }}
                    onBlur={handleLineReadingBlur}
                    placeholder='e.g., "emphasized last word"'
                    className="h-8 text-sm border-border/60"
                    disabled={isUpdating}
                  />
                </div>

                {/* Continuity Notes */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Continuity Notes</label>
                  <Textarea
                    value={localContinuityNotes}
                    onChange={(e) => {
                      setLocalContinuityNotes(e.target.value)
                      setHasContinuityChanged(true)
                    }}
                    onBlur={handleContinuityBlur}
                    placeholder="Wardrobe, props, positioning..."
                    className="min-h-[60px] text-sm resize-none border-border/60"
                    disabled={isUpdating}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
