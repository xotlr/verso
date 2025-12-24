"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { FileText, AlertTriangle, Check, Film } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Shot {
  id: string
  shotNumber: number
  description: string
  status: string
  takeCount: number
  circledTake: number | null
  supervisorNotes: string | null
  lineReading: string | null
  continuityNotes: string | null
  isFlagged: boolean
  sceneId: string
}

interface Scene {
  id: string
  number: number
  heading: string
}

interface SupervisorReportProps {
  date: Date
  shots: Shot[]
  scenes: Scene[]
  onExport?: () => void
}

export function SupervisorReport({
  date,
  shots,
  scenes,
  onExport,
}: SupervisorReportProps) {
  const stats = useMemo(() => {
    const completed = shots.filter(
      (s) => s.status === "shot" || s.status === "approved"
    )
    const flagged = shots.filter((s) => s.isFlagged)
    const withNotes = shots.filter(
      (s) => s.supervisorNotes || s.lineReading || s.continuityNotes
    )
    const totalTakes = shots.reduce((sum, s) => sum + s.takeCount, 0)

    return {
      totalShots: shots.length,
      completedShots: completed.length,
      flaggedShots: flagged.length,
      shotsWithNotes: withNotes.length,
      totalTakes,
    }
  }, [shots])

  // Group shots by scene
  const shotsByScene = useMemo(() => {
    const map = new Map<string, Shot[]>()
    shots.forEach((shot) => {
      if (!map.has(shot.sceneId)) {
        map.set(shot.sceneId, [])
      }
      map.get(shot.sceneId)!.push(shot)
    })
    return map
  }, [shots])

  // Only show scenes with completed shots or notes
  const relevantScenes = useMemo(() => {
    return scenes.filter((scene) => {
      const sceneShots = shotsByScene.get(scene.id) || []
      return sceneShots.some(
        (s) =>
          s.status === "shot" ||
          s.status === "approved" ||
          s.supervisorNotes ||
          s.isFlagged
      )
    })
  }, [scenes, shotsByScene])

  if (stats.completedShots === 0 && stats.shotsWithNotes === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No shots completed today</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">
          Supervisor Report
        </CardTitle>
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <FileText className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {format(date, "EEEE, MMMM d, yyyy")}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={Film}
            label="Shots"
            value={stats.completedShots}
            subtext={`of ${stats.totalShots}`}
          />
          <StatCard
            icon={Check}
            label="Takes"
            value={stats.totalTakes}
          />
          <StatCard
            icon={AlertTriangle}
            label="Flagged"
            value={stats.flaggedShots}
            highlight={stats.flaggedShots > 0}
          />
          <StatCard
            icon={FileText}
            label="Notes"
            value={stats.shotsWithNotes}
          />
        </div>

        {/* Scene breakdown */}
        {relevantScenes.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h4 className="text-sm font-medium text-muted-foreground">
              By Scene
            </h4>
            {relevantScenes.map((scene) => (
              <SceneReportSection
                key={scene.id}
                scene={scene}
                shots={shotsByScene.get(scene.id) || []}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface StatCardProps {
  icon: typeof Film
  label: string
  value: number
  subtext?: string
  highlight?: boolean
}

function StatCard({ icon: Icon, label, value, subtext, highlight }: StatCardProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums",
            highlight && "text-foreground"
          )}
        >
          {value}
        </span>
        {subtext && (
          <span className="text-sm text-muted-foreground">{subtext}</span>
        )}
      </div>
    </div>
  )
}

interface SceneReportSectionProps {
  scene: Scene
  shots: Shot[]
}

function SceneReportSection({ scene, shots }: SceneReportSectionProps) {
  const completedShots = shots.filter(
    (s) => s.status === "shot" || s.status === "approved"
  )
  const flaggedShots = shots.filter((s) => s.isFlagged)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {scene.number}. {scene.heading}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {completedShots.length}/{shots.length} shots
        </span>
      </div>

      {flaggedShots.length > 0 && (
        <div className="pl-4 space-y-1">
          {flaggedShots.map((shot) => (
            <div
              key={shot.id}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">Shot {shot.shotNumber}</span>
                {shot.continuityNotes && (
                  <span className="ml-1">— {shot.continuityNotes}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
