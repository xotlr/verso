"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProgressBarSimple, ProgressBarSegmented } from "./progress-bar-simple"
import { ProgressStats, ProgressSummary } from "./progress-stats"
import type { ProductionProgress } from "@/types/production-tracking"
import { Skeleton } from "@/components/ui/skeleton"

interface ProgressDashboardProps {
  progress: ProductionProgress | null
  isLoading?: boolean
  variant?: "full" | "compact" | "minimal"
}

export function ProgressDashboard({
  progress,
  isLoading = false,
  variant = "full",
}: ProgressDashboardProps) {
  // Calculate status counts from scenes
  const statusCounts = useMemo(() => {
    if (!progress) {
      return { planned: 0, setup: 0, shot: 0, approved: 0 }
    }

    const counts = { planned: 0, setup: 0, shot: 0, approved: 0 }
    progress.scenes.forEach((scene) => {
      counts.planned += scene.shotProgress.planned
      counts.setup += scene.shotProgress.setup
      counts.shot += scene.shotProgress.shot
      counts.approved += scene.shotProgress.approved
    })
    return counts
  }, [progress])

  if (isLoading) {
    return <ProgressDashboardSkeleton variant={variant} />
  }

  if (!progress || progress.totalShots === 0) {
    return null
  }

  if (variant === "minimal") {
    return (
      <div className="flex items-center gap-4">
        <ProgressBarSimple
          percent={progress.percentComplete}
          size="sm"
          className="flex-1"
        />
        <ProgressSummary
          completed={progress.completedShots}
          total={progress.totalShots}
          size="sm"
        />
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Production Progress</span>
            <ProgressSummary
              completed={progress.completedShots}
              total={progress.totalShots}
              size="sm"
            />
          </div>
          <ProgressBarSegmented
            {...statusCounts}
            total={progress.totalShots}
            size="md"
          />
        </CardContent>
      </Card>
    )
  }

  // Full variant
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Production Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold tabular-nums">
              {progress.percentComplete}%
            </span>
            <ProgressSummary
              completed={progress.completedShots}
              total={progress.totalShots}
              size="md"
              showPercent={false}
            />
          </div>
          <ProgressBarSegmented
            {...statusCounts}
            total={progress.totalShots}
            size="lg"
          />
        </div>

        {/* Status breakdown */}
        <div className="pt-2 border-t border-border/50">
          <ProgressStats
            {...statusCounts}
            layout="grid"
            size="md"
          />
        </div>

        {/* Scene progress list */}
        {progress.scenes.length > 0 && (
          <div className="pt-2 border-t border-border/50 space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">By Scene</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {progress.scenes.map((scene) => (
                <SceneProgressRow key={scene.sceneId} scene={scene} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Individual scene progress row
interface SceneProgressRowProps {
  scene: ProductionProgress["scenes"][number]
}

function SceneProgressRow({ scene }: SceneProgressRowProps) {
  const { shotProgress } = scene

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-6 text-right tabular-nums">
        {scene.sceneNumber}
      </span>
      <ProgressBarSimple
        percent={shotProgress.percentComplete}
        size="sm"
        className="flex-1"
      />
      <span className="text-xs tabular-nums text-muted-foreground min-w-[3rem] text-right">
        {shotProgress.shot + shotProgress.approved}/{shotProgress.total}
      </span>
    </div>
  )
}

// Skeleton loader
function ProgressDashboardSkeleton({ variant }: { variant: string }) {
  if (variant === "minimal") {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-1 flex-1" />
        <Skeleton className="h-4 w-16" />
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="pt-2 border-t border-border/50">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-5" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
