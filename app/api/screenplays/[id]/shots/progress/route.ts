import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { canUseProduction, type PlanType } from "@/lib/stripe"
import type { ProductionProgress, SceneProgress, ShotProgress, ShotStatus } from "@/types/production-tracking"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: screenplayId } = params

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    })
    const plan = (dbUser?.plan as PlanType) || "FREE"

    if (!canUseProduction(plan)) {
      throw new ForbiddenError("Production features require PRO plan")
    }

    const access = await checkScreenplayAccess(screenplayId, user.id)
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

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
        heading: `Scene ${sceneNumber}`,
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

    return { progress }
  },
})
