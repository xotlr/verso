import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError, ConflictError } from "@/lib/api"
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

const createRoleSchema = z.object({
  role: z.string().min(1, "Role is required"),
  name: z.string().optional(),
  userId: z.string().optional().nullable(),
  assignSelf: z.boolean().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const roles = await prisma.projectRole.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { role: "asc" },
    })

    return roles
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createRoleSchema,
  handler: async ({ user, params, data }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    let finalName = data.name
    let finalUserId = data.userId

    if (data.assignSelf) {
      finalUserId = user.id
      finalName = user.name || user.email || "Me"
    } else if (data.userId && !data.name) {
      const targetUser = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { name: true, email: true },
      })
      if (targetUser) {
        finalName = targetUser.name || targetUser.email || "Unknown"
      }
    }

    if (!finalName) {
      throw new BadRequestError("Name is required")
    }

    const existing = await prisma.projectRole.findUnique({
      where: {
        projectId_role_name: {
          projectId,
          role: data.role,
          name: finalName,
        },
      },
    })

    if (existing) {
      throw new ConflictError("This role assignment already exists")
    }

    if (finalUserId) {
      const existingUserRole = await prisma.projectRole.findFirst({
        where: { projectId, role: data.role, userId: finalUserId },
      })

      if (existingUserRole) {
        throw new ConflictError("This user already has this role on the project")
      }
    }

    const role = await prisma.projectRole.create({
      data: {
        projectId,
        role: data.role,
        name: finalName,
        userId: finalUserId,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })

    return role
  },
})
