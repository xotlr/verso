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

    const createdShots = await prisma.$transaction(async (tx) => {
      const results = []

      for (const [sceneId, sceneShots] of shotsByScene) {
        // Get the current highest shot number for this scene
        const lastShot = await tx.shot.findFirst({
          where: {
            screenplayId,
            sceneId,
          },
          orderBy: { shotNumber: "desc" },
          select: { shotNumber: true },
        })

        let nextShotNumber = (lastShot?.shotNumber ?? 0) + 1

        // Create all shots for this scene
        for (const shotData of sceneShots) {
          const shot = await tx.shot.create({
            data: {
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
            },
          })
          results.push(shot)
          nextShotNumber++
        }
      }

      return results
    })

    return { shots: createdShots, count: createdShots.length }
  },
})
