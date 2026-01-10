import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })
  return project?.userId === userId
}

const updateRoleNeedSchema = z.object({
  role: z.string().min(1).optional(),
  description: z.string().max(1000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  isPaid: z.boolean().optional(),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateRoleNeedSchema,
  handler: async ({ user, params, data }) => {
    const { id: projectId, needId } = params

    const isOwner = await isProjectOwner(projectId, user.id)
    if (!isOwner) {
      throw new ForbiddenError("Only project owner can update role needs")
    }

    const existingRoleNeed = await prisma.projectRoleNeed.findFirst({
      where: {
        id: needId,
        projectId,
      },
    })

    if (!existingRoleNeed) {
      throw new NotFoundError("Role need")
    }

    const roleNeed = await prisma.projectRoleNeed.update({
      where: { id: needId },
      data,
    })

    return roleNeed
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: projectId, needId } = params

    const isOwner = await isProjectOwner(projectId, user.id)
    if (!isOwner) {
      throw new ForbiddenError("Only project owner can delete role needs")
    }

    const existingRoleNeed = await prisma.projectRoleNeed.findFirst({
      where: {
        id: needId,
        projectId,
      },
    })

    if (!existingRoleNeed) {
      throw new NotFoundError("Role need")
    }

    await prisma.projectRoleNeed.delete({
      where: { id: needId },
    })

    return { success: true }
  },
})
