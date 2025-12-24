"use client"

import { useState, useCallback } from "react"
import { Plus, Circle, Star, X, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface TakeNote {
  id: string
  shotId: string
  takeNum: number
  rating: string | null // good | bad | circle | print
  notes: string | null
  timecode: string | null
}

interface TakeNotesPanelProps {
  shotId: string
  screenplayId: string
  takeNotes: TakeNote[]
  takeCount: number
  circledTake: number | null
  onTakeNotesChange?: (notes: TakeNote[]) => void
}

const RATING_CONFIG = {
  good: { icon: Check, label: "Good", symbol: "+" },
  bad: { icon: X, label: "Bad", symbol: "-" },
  circle: { icon: Circle, label: "Circle", symbol: "○" },
  print: { icon: Star, label: "Print", symbol: "★" },
} as const

type RatingType = keyof typeof RATING_CONFIG

export function TakeNotesPanel({
  shotId,
  screenplayId,
  takeNotes,
  takeCount,
  onTakeNotesChange,
}: TakeNotesPanelProps) {
  const [expandedTake, setExpandedTake] = useState<number | null>(null)
  const [saving, setSaving] = useState<number | null>(null)

  const getTakeNote = useCallback(
    (takeNum: number) => takeNotes.find((n) => n.takeNum === takeNum),
    [takeNotes]
  )

  const saveTakeNote = useCallback(
    async (takeNum: number, updates: Partial<TakeNote>) => {
      setSaving(takeNum)
      try {
        const response = await fetch(
          `/api/screenplays/${screenplayId}/shots/${shotId}/takes/${takeNum}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          }
        )

        if (!response.ok) throw new Error("Failed to save take note")

        const { takeNote } = await response.json()
        const updated = takeNotes.some((n) => n.takeNum === takeNum)
          ? takeNotes.map((n) => (n.takeNum === takeNum ? takeNote : n))
          : [...takeNotes, takeNote]
        onTakeNotesChange?.(updated)
      } catch (error) {
        console.error("Error saving take note:", error)
        toast.error("Failed to save take note")
      } finally {
        setSaving(null)
      }
    },
    [screenplayId, shotId, takeNotes, onTakeNotesChange]
  )

  // Generate take numbers array
  const takes = Array.from({ length: takeCount }, (_, i) => i + 1)

  if (takeCount === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        No takes recorded yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {takes.map((takeNum) => {
        const note = getTakeNote(takeNum)
        const isExpanded = expandedTake === takeNum
        const isSaving = saving === takeNum

        return (
          <div
            key={takeNum}
            className={cn(
              "border border-border/50 rounded-lg overflow-hidden",
              isExpanded && "bg-muted/30"
            )}
          >
            {/* Take header */}
            <button
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedTake(isExpanded ? null : takeNum)}
            >
              {/* Take number */}
              <span className="text-sm font-medium tabular-nums w-8">
                T{takeNum}
              </span>

              {/* Rating indicator */}
              <div className="flex gap-1">
                {note?.rating ? (
                  <span className="text-sm">
                    {RATING_CONFIG[note.rating as RatingType]?.symbol || ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50 text-sm">○</span>
                )}
              </div>

              {/* Timecode */}
              {note?.timecode && (
                <span className="text-xs text-muted-foreground font-mono">
                  {note.timecode}
                </span>
              )}

              {/* Notes preview */}
              {note?.notes && (
                <span className="flex-1 text-xs text-muted-foreground truncate">
                  {note.notes}
                </span>
              )}

              {/* Loading indicator */}
              {isSaving && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="p-3 pt-0 space-y-3 border-t border-border/50">
                {/* Rating buttons */}
                <div className="flex gap-2">
                  {(Object.keys(RATING_CONFIG) as RatingType[]).map((rating) => {
                    const config = RATING_CONFIG[rating]
                    const isSelected = note?.rating === rating

                    return (
                      <Button
                        key={rating}
                        variant={isSelected ? "secondary" : "ghost"}
                        size="sm"
                        className={cn(
                          "flex-1 h-8",
                          isSelected && "font-medium"
                        )}
                        onClick={() =>
                          saveTakeNote(takeNum, {
                            rating: isSelected ? null : rating,
                          })
                        }
                        disabled={isSaving}
                      >
                        {config.symbol} {config.label}
                      </Button>
                    )
                  })}
                </div>

                {/* Timecode */}
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground w-16">TC:</span>
                  <Input
                    placeholder="00:00:00:00"
                    className="h-8 font-mono text-xs"
                    defaultValue={note?.timecode || ""}
                    onBlur={(e) =>
                      saveTakeNote(takeNum, { timecode: e.target.value || null })
                    }
                    disabled={isSaving}
                  />
                </div>

                {/* Notes */}
                <Textarea
                  placeholder="Take notes..."
                  className="min-h-[60px] text-sm resize-none"
                  defaultValue={note?.notes || ""}
                  onBlur={(e) =>
                    saveTakeNote(takeNum, { notes: e.target.value || null })
                  }
                  disabled={isSaving}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Add take button - just for display, actual take count handled by shot-checklist */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
        disabled
      >
        <Plus className="h-4 w-4 mr-2" />
        Takes are added from the shot checklist
      </Button>
    </div>
  )
}
