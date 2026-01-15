import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
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
  handler: async ({ user, params, data }) => {
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

    // Fetch all last shot numbers in one query (outside transaction for speed)
    const lastShots = await prisma.shot.groupBy({
      by: ["sceneId"],
      where: {
        screenplayId,
        sceneId: { in: sceneIds },
      },
      _max: { shotNumber: true },
    })

    const lastShotByScene = new Map(
      lastShots.map((s) => [s.sceneId, s._max.shotNumber ?? 0])
    )

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
    await prisma.shot.createMany({
      data: shotsToCreate,
    })

    // Fetch the created shots to return them
    const createdShots = await prisma.shot.findMany({
      where: {
        screenplayId,
        sceneId: { in: sceneIds },
        shotNumber: {
          gte: Math.min(...shotsToCreate.map((s) => s.shotNumber)),
        },
      },
      orderBy: [{ sceneId: "asc" }, { shotNumber: "asc" }],
    })

    return { shots: createdShots, count: createdShots.length }
  },
})
