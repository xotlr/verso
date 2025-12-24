import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canUseProduction, type PlanType } from "@/lib/stripe"
import type { ProductionProgress, SceneProgress, ShotProgress, ShotStatus } from "@/types/production-tracking"

// Helper to check screenplay access
async function checkScreenplayAccess(screenplayId: string, userId: string) {
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    select: { userId: true, teamId: true },
  })

  if (!screenplay) return null

  // Check direct ownership
  if (screenplay.userId === userId) return screenplay

  // Check team membership
  if (screenplay.teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: screenplay.teamId,
          userId,
        },
      },
    })
    if (membership) return screenplay
  }

  return null
}

// GET /api/screenplays/[id]/shots/progress - Get production progress stats
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Check plan access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    })
    const plan = (user?.plan as PlanType) || "FREE"

    if (!canUseProduction(plan)) {
      return NextResponse.json(
        { error: "Production features require PRO plan", upgradeRequired: true },
        { status: 403 }
      )
    }

    const { id: screenplayId } = await params

    // Check access
    const screenplay = await checkScreenplayAccess(screenplayId, session.user.id)
    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found or access denied" },
        { status: 404 }
      )
    }

    // Get all shots for this screenplay
    const shots = await prisma.shot.findMany({
      where: { screenplayId },
      select: {
        id: true,
        sceneId: true,
        status: true,
      },
      orderBy: [
        { sceneId: "asc" },
        { shotNumber: "asc" },
      ],
    })

    // Calculate overall progress
    const statusCounts = {
      planned: 0,
      setup: 0,
      shot: 0,
      approved: 0,
    }

    shots.forEach((shot) => {
      const status = shot.status as ShotStatus
      if (status in statusCounts) {
        statusCounts[status]++
      }
    })

    const totalShots = shots.length
    const completedShots = statusCounts.shot + statusCounts.approved
    const percentComplete = totalShots > 0
      ? Math.round((completedShots / totalShots) * 100)
      : 0

    // Group shots by scene for scene-level progress
    const sceneMap = new Map<string, { shots: typeof shots }>()
    shots.forEach((shot) => {
      if (!sceneMap.has(shot.sceneId)) {
        sceneMap.set(shot.sceneId, { shots: [] })
      }
      sceneMap.get(shot.sceneId)!.shots.push(shot)
    })

    const scenes: SceneProgress[] = []
    let sceneNumber = 1
    for (const [sceneId, data] of sceneMap) {
      const sceneCounts = {
        planned: 0,
        setup: 0,
        shot: 0,
        approved: 0,
      }

      data.shots.forEach((shot) => {
        const status = shot.status as ShotStatus
        if (status in sceneCounts) {
          sceneCounts[status]++
        }
      })

      const sceneTotal = data.shots.length
      const sceneCompleted = sceneCounts.shot + sceneCounts.approved
      const scenePercent = sceneTotal > 0
        ? Math.round((sceneCompleted / sceneTotal) * 100)
        : 0

      const shotProgress: ShotProgress = {
        total: sceneTotal,
        ...sceneCounts,
        percentComplete: scenePercent,
      }

      scenes.push({
        sceneId,
        sceneNumber,
        heading: `Scene ${sceneNumber}`, // Could be enhanced with actual scene heading
        shotProgress,
        isComplete: scenePercent === 100,
      })

      sceneNumber++
    }

    const progress: ProductionProgress = {
      totalShots,
      completedShots,
      approvedShots: statusCounts.approved,
      percentComplete,
      scenes,
    }

    return NextResponse.json({ progress })
  } catch (error) {
    console.error("Error fetching production progress:", error)
    return NextResponse.json(
      { error: "Failed to fetch production progress" },
      { status: 500 }
    )
  }
}
