import { z } from "zod"
import { createApiHandler, ForbiddenError, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const PLAN_LIMITS: Record<string, number> = {
  FREE: 10,
  PLUS: 50,
  PRO: 100,
  MAX: 500,
}

const createStackSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  projectId: z.string().optional(),
  screenplayIds: z.array(z.string()).optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    const stacks = await prisma.stack.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        projectId: true,
        project: { select: { id: true, name: true } },
        screenplays: {
          select: {
            id: true,
            title: true,
            wordCount: true,
            updatedAt: true,
            type: true,
            genre: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        _count: { select: { screenplays: true } },
      },
    })

    return stacks
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createStackSchema,
  rateLimit: RATE_LIMITS.PROJECT_CREATE,
  handler: async ({ user, data }) => {
    const { name, projectId, screenplayIds } = data

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    })

    const plan = userData?.plan || "FREE"
    const limit = PLAN_LIMITS[plan]

    const stackCount = await prisma.stack.count({
      where: { userId: user.id },
    })

    if (stackCount >= limit) {
      throw new ForbiddenError(
        `You've reached the limit of ${limit} stacks on the ${plan} plan. Upgrade to create more.`
      )
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: user.id },
      })
      if (!project) {
        throw new ForbiddenError("Project not found or access denied")
      }
    }

    if (screenplayIds && screenplayIds.length > 0) {
      const ownedScreenplays = await prisma.screenplay.count({
        where: { id: { in: screenplayIds }, userId: user.id },
      })
      if (ownedScreenplays !== screenplayIds.length) {
        throw new ForbiddenError("One or more screenplays not found or access denied")
      }
    }

    const stack = await prisma.stack.create({
      data: {
        name,
        userId: user.id,
        projectId: projectId || null,
        screenplays: screenplayIds
          ? { connect: screenplayIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        screenplays: {
          select: { id: true, title: true, wordCount: true, updatedAt: true },
        },
        project: { select: { id: true, name: true } },
        _count: { select: { screenplays: true } },
      },
    })

    await prisma.activity.create({
      data: {
        userId: user.id,
        type: "stack_created",
        entityId: stack.id,
        entityTitle: stack.name,
      },
    })

    return stack
  },
})
