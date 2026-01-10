import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError, ConflictError, RateLimitError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })
  return project?.userId === userId
}

const createApplicationSchema = z.object({
  message: z.string().max(1000).optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: projectId, needId } = params

    const isOwner = await isProjectOwner(projectId, user.id)
    if (!isOwner) {
      throw new ForbiddenError("Only project owner can view applications")
    }

    const roleNeed = await prisma.projectRoleNeed.findFirst({
      where: {
        id: needId,
        projectId,
      },
    })

    if (!roleNeed) {
      throw new NotFoundError("Role need")
    }

    const applications = await prisma.projectRoleApplication.findMany({
      where: { roleNeedId: needId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        message: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            title: true,
            bio: true,
            location: true,
          },
        },
      },
    })

    return { applications }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createApplicationSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data }) => {
    const { id: projectId, needId } = params

    const roleNeed = await prisma.projectRoleNeed.findFirst({
      where: {
        id: needId,
        projectId,
        project: {
          isPublic: true,
        },
      },
      include: {
        project: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
    })

    if (!roleNeed) {
      throw new NotFoundError("Role need not found or project is not public")
    }

    if (roleNeed.project.userId === user.id) {
      throw new BadRequestError("Cannot apply to your own project's roles")
    }

    const existingApplication = await prisma.projectRoleApplication.findUnique({
      where: {
        roleNeedId_userId: {
          roleNeedId: needId,
          userId: user.id,
        },
      },
    })

    if (existingApplication) {
      throw new ConflictError("You have already applied for this role")
    }

    const application = await prisma.projectRoleApplication.create({
      data: {
        roleNeedId: needId,
        userId: user.id,
        message: data.message || null,
      },
    })

    await prisma.activity.create({
      data: {
        userId: user.id,
        type: "role_application",
        entityId: projectId,
        entityTitle: roleNeed.project.name,
      },
    })

    return application
  },
})
