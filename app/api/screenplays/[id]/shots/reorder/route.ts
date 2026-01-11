import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"

const reorderSchema = z.object({
  // Array of shot IDs in the new order
  shotIds: z.array(z.string().min(1)).min(1),
  // The scene these shots belong to
  sceneId: z.string().min(1),
})

export const POST = createApiHandler({
  auth: "required",
  schema: reorderSchema,
  handler: async ({ user, params, data }) => {
    const { id: screenplayId } = params
    const { shotIds, sceneId } = data

    const access = await checkScreenplayAccess(screenplayId, user.id, "EDITOR")
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    // Verify all shots exist and belong to this screenplay and scene
    const existingShots = await prisma.shot.findMany({
      where: {
        id: { in: shotIds },
        screenplayId,
        sceneId,
      },
      select: { id: true },
    })

    const existingIds = new Set(existingShots.map((s) => s.id))
    const missingIds = shotIds.filter((id) => !existingIds.has(id))

    if (missingIds.length > 0) {
      throw new NotFoundError(`Shots not found: ${missingIds.join(", ")}`)
    }

    // Update shot numbers in a transaction
    await prisma.$transaction(
      shotIds.map((shotId, index) =>
        prisma.shot.update({
          where: { id: shotId },
          data: { shotNumber: index + 1 },
        })
      )
    )

    // Fetch updated shots
    const updatedShots = await prisma.shot.findMany({
      where: {
        screenplayId,
        sceneId,
      },
      orderBy: { shotNumber: "asc" },
    })

    return { shots: updatedShots }
  },
})
