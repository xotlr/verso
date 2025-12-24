"use client"

import { useState, useCallback, useMemo } from "react"
import { type ShotStatus } from "@/types/production-tracking"
import { ShotChecklistScene } from "./shot-checklist-scene"
import { ProductionEmpty } from "../shared/production-empty"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface Shot {
  id: string
  sceneId: string
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

interface Scene {
  id: string
  heading: string
  number: number
}

interface ShotChecklistProps {
  screenplayId: string
  shots: Shot[]
  scenes: Scene[]
  isLoading?: boolean
  onShotsChange?: (shots: Shot[]) => void
}

export function ShotChecklist({
  screenplayId,
  shots: initialShots,
  scenes,
  isLoading = false,
  onShotsChange,
}: ShotChecklistProps) {
  const [shots, setShots] = useState<Shot[]>(initialShots)
  const [updatingShots, setUpdatingShots] = useState<Set<string>>(new Set())

  // Group shots by scene
  const shotsByScene = useMemo(() => {
    const map = new Map<string, Shot[]>()
    shots.forEach((shot) => {
      if (!map.has(shot.sceneId)) {
        map.set(shot.sceneId, [])
      }
      map.get(shot.sceneId)!.push(shot)
    })
    // Sort shots within each scene by shot number
    map.forEach((sceneShots) => {
      sceneShots.sort((a, b) => a.shotNumber - b.shotNumber)
    })
    return map
  }, [shots])

  // Get scenes that have shots, in order
  const scenesWithShots = useMemo(() => {
    return scenes.filter((scene) => shotsByScene.has(scene.id))
  }, [scenes, shotsByScene])

  const updateShot = useCallback(async (
    shotId: string,
    updates: Partial<Pick<Shot, "status" | "takeCount" | "circledTake" | "quickNotes" | "lineReading" | "continuityNotes" | "isFlagged">>
  ) => {
    setUpdatingShots((prev) => new Set(prev).add(shotId))

    try {
      const response = await fetch(
        `/api/screenplays/${screenplayId}/shots/${shotId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update shot")
      }

      const { shot: updatedShot } = await response.json()

      setShots((prev) => {
        const newShots = prev.map((s) =>
          s.id === shotId ? { ...s, ...updatedShot } : s
        )
        onShotsChange?.(newShots)
        return newShots
      })
    } catch (error) {
      console.error("Error updating shot:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update shot")
    } finally {
      setUpdatingShots((prev) => {
        const next = new Set(prev)
        next.delete(shotId)
        return next
      })
    }
  }, [screenplayId, onShotsChange])

  const handleStatusChange = useCallback(async (shotId: string, status: ShotStatus) => {
    await updateShot(shotId, { status })
  }, [updateShot])

  const handleTakeChange = useCallback(async (
    shotId: string,
    takeCount: number,
    circledTake?: number | null
  ) => {
    await updateShot(shotId, { takeCount, circledTake })
  }, [updateShot])

  const handleNotesChange = useCallback(async (shotId: string, quickNotes: string) => {
    await updateShot(shotId, { quickNotes })
  }, [updateShot])

  const handleSupervisorChange = useCallback(async (
    shotId: string,
    updates: { lineReading?: string | null; continuityNotes?: string | null; isFlagged?: boolean }
  ) => {
    await updateShot(shotId, updates)
  }, [updateShot])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (shots.length === 0) {
    return (
      <ProductionEmpty
        title="No shots yet"
        description="Create a shotlist in your screenplay to start tracking production progress."
      />
    )
  }

  return (
    <div className="space-y-4">
      {scenesWithShots.map((scene) => (
        <ShotChecklistScene
          key={scene.id}
          sceneHeading={scene.heading}
          sceneNumber={scene.number}
          shots={shotsByScene.get(scene.id) || []}
          onStatusChange={handleStatusChange}
          onTakeChange={handleTakeChange}
          onNotesChange={handleNotesChange}
          onSupervisorChange={handleSupervisorChange}
          isUpdating={updatingShots.size > 0}
        />
      ))}
    </div>
  )
}
