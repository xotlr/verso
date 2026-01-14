import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { z } from "zod"

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  order: z.number().int().min(0).optional(),
})

/**
 * PATCH /api/screenplays/[id]/card-groups/[groupId]
 * Update a single custom card group
 */
export const PATCH = createApiHandler({
  auth: "required",
  handler: async ({ user, params, request }) => {
    const { id, groupId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    // Verify group belongs to this screenplay
    const existingGroup = await prisma.customCardGroup.findFirst({
      where: {
        id: groupId,
        screenplayId: id,
      },
    })

    if (!existingGroup) {
      throw new NotFoundError("Custom card group")
    }

    const body = await request.json()
    const data = UpdateGroupSchema.parse(body)

    const updatedGroup = await prisma.customCardGroup.update({
      where: { id: groupId },
      data,
    })

    return updatedGroup
  },
})

/**
 * DELETE /api/screenplays/[id]/card-groups/[groupId]
 * Delete a custom card group (sets all scenes' customGroupId to null)
 */
export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id, groupId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    // Verify group belongs to this screenplay
    const existingGroup = await prisma.customCardGroup.findFirst({
      where: {
        id: groupId,
        screenplayId: id,
      },
    })

    if (!existingGroup) {
      throw new NotFoundError("Custom card group")
    }

    // Delete the group (cascade will set customGroupId to null in SceneMeta due to onDelete: SetNull)
    await prisma.customCardGroup.delete({
      where: { id: groupId },
    })

    return { success: true }
  },
})
