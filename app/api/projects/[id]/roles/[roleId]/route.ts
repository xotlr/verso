import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        include: { members: { where: { userId } } },
      },
    },
  })

  if (!project) return false
  if (project.userId === userId) return true
  if (project.team && project.team.members.length > 0) return true

  return false
}

const updateRoleSchema = z.object({
  role: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  userId: z.string().optional().nullable(),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateRoleSchema,
  handler: async ({ user, params, data }) => {
    const { id: projectId, roleId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const existingRole = await prisma.projectRole.findFirst({
      where: { id: roleId, projectId },
    })

    if (!existingRole) {
      throw new NotFoundError("Role")
    }

    const updatedRole = await prisma.projectRole.update({
      where: { id: roleId },
      data,
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })

    return updatedRole
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: projectId, roleId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const existingRole = await prisma.projectRole.findFirst({
      where: { id: roleId, projectId },
    })

    if (!existingRole) {
      throw new NotFoundError("Role")
    }

    await prisma.projectRole.delete({
      where: { id: roleId },
    })

    return { success: true }
  },
})
