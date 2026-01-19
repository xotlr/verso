import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { canAccessProductionFeatures, type PlanType } from "@/lib/stripe"
import type { ProductionProgress, SceneProgress, ShotProgress, ShotStatus } from "@/types/production-tracking"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: screenplayId } = params

    // Fetch both plan AND stripeCurrentPeriodEnd for proper validation
    const { data: dbUser, error: userError } = await supabase
      .from("User")
      .select("plan, stripeCurrentPeriodEnd")
      .eq("id", user.id)
      .single()

    if (userError) handleSupabaseError(userError, "User")

    const plan = (dbUser?.plan as PlanType) || "FREE"
    const periodEnd = dbUser?.stripeCurrentPeriodEnd as string | null

    // SECURITY: Validate both plan AND subscription period
    if (!canAccessProductionFeatures(plan, periodEnd)) {
      throw new ForbiddenError("Production features require an active PRO subscription")
    }

    const access = await checkScreenplayAccess(screenplayId, user.id)
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: shots, error: shotsError } = await supabase
      .from("Shot")
      .select("id, sceneId, status")
      .eq("screenplayId", screenplayId)
      .order("sceneId", { ascending: true })
      .order("shotNumber", { ascending: true })

    if (shotsError) handleSupabaseError(shotsError, "Shot")

    const statusCounts = {
      planned: 0,
      setup: 0,
      shot: 0,
      approved: 0,
    }

    interface ShotData { id: string; status: string; sceneId: string }
    const typedShots = (shots || []) as ShotData[]

    typedShots.forEach((shot) => {
      const status = shot.status as ShotStatus
      if (status in statusCounts) {
        statusCounts[status]++
      }
    })

    const totalShots = typedShots.length
    const completedShots = statusCounts.shot + statusCounts.approved
    const percentComplete = totalShots > 0
      ? Math.round((completedShots / totalShots) * 100)
      : 0

    const sceneMap = new Map<string, { shots: ShotData[] }>()
    typedShots.forEach((shot) => {
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
