import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { SHOT_TYPES, SHOT_STATUSES } from "@/types/shotlist"

const batchShotSchema = z.object({
  sceneId: z.string().min(1),
  description: z.string().min(1),
  shotType: z.enum(SHOT_TYPES).nullable().optional(),
  status: z.enum(SHOT_STATUSES).optional().default("planned"),
})

const batchCreateSchema = z.object({
  shots: z.array(batchShotSchema).min(1).max(100),
})

export const POST = createApiHandler({
  auth: "required",
  schema: batchCreateSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: screenplayId } = params

    const access = await checkScreenplayAccess(screenplayId, user.id, "EDITOR")
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    // Group shots by scene for proper numbering
    const shotsByScene = new Map<string, typeof data.shots>()
    for (const shot of data.shots) {
      const existing = shotsByScene.get(shot.sceneId) || []
      existing.push(shot)
      shotsByScene.set(shot.sceneId, existing)
    }

    const sceneIds = Array.from(shotsByScene.keys())

    // Fetch max shot numbers per scene
    const { data: lastShots, error: lastShotsError } = await supabase
      .from("Shot")
      .select("sceneId, shotNumber")
      .eq("screenplayId", screenplayId)
      .in("sceneId", sceneIds)
      .order("shotNumber", { ascending: false })

    if (lastShotsError) handleSupabaseError(lastShotsError, "Shot")

    // Get max shot number per scene
    const lastShotByScene = new Map<string, number>()
    for (const shot of lastShots || []) {
      if (!lastShotByScene.has(shot.sceneId) || shot.shotNumber > lastShotByScene.get(shot.sceneId)!) {
        lastShotByScene.set(shot.sceneId, shot.shotNumber)
      }
    }

    // Prepare all shot data for batch insert
    const shotsToCreate: Array<{
      screenplayId: string
      sceneId: string
      shotNumber: number
      description: string
      shotType: string | null
      cameraAngle: string | null
      movement: string | null
      duration: number | null
      lens: string | null
      equipment: string | null
      lighting: string | null
      audio: string | null
      notes: string | null
      status: string
      thumbnailUrl: string | null
      thumbnailType: string | null
    }> = []

    for (const [sceneId, sceneShots] of shotsByScene) {
      let nextShotNumber = (lastShotByScene.get(sceneId) ?? 0) + 1

      for (const shotData of sceneShots) {
        shotsToCreate.push({
          screenplayId,
          sceneId,
          shotNumber: nextShotNumber,
          description: shotData.description,
          shotType: shotData.shotType ?? null,
          cameraAngle: null,
          movement: null,
          duration: null,
          lens: null,
          equipment: null,
          lighting: null,
          audio: null,
          notes: null,
          status: shotData.status,
          thumbnailUrl: null,
          thumbnailType: null,
        })
        nextShotNumber++
      }
    }

    // Batch insert all shots at once
    const { error: insertError } = await supabase
      .from("Shot")
      .insert(shotsToCreate)

    if (insertError) handleSupabaseError(insertError, "Shot")

    // Fetch the created shots to return them
    const minShotNumber = Math.min(...shotsToCreate.map((s) => s.shotNumber))
    const { data: createdShots, error: fetchError } = await supabase
      .from("Shot")
      .select("*")
      .eq("screenplayId", screenplayId)
      .in("sceneId", sceneIds)
      .gte("shotNumber", minShotNumber)
      .order("sceneId", { ascending: true })
      .order("shotNumber", { ascending: true })

    if (fetchError) handleSupabaseError(fetchError, "Shot")

    return { shots: createdShots || [], count: createdShots?.length || 0 }
  },
})
