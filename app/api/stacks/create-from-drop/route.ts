import { z } from "zod"
import { createApiHandler, BadRequestError, ForbiddenError, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const PLAN_LIMITS: Record<string, number> = {
  FREE: 10,
  PLUS: 50,
  PRO: 100,
  MAX: 500,
}

const createFromDropSchema = z.object({
  draggedId: z.string().min(1, "Dragged screenplay ID required"),
  targetId: z.string().min(1, "Target screenplay ID required"),
  projectId: z.string().optional(),
})

export const POST = createApiHandler({
  auth: "required",
  schema: createFromDropSchema,
  rateLimit: RATE_LIMITS.PROJECT_CREATE,
  handler: async ({ user, data }) => {
    const { draggedId, targetId, projectId } = data

    if (draggedId === targetId) {
      throw new BadRequestError("Cannot stack a screenplay onto itself")
    }

    const screenplays = await prisma.screenplay.findMany({
      where: { id: { in: [draggedId, targetId] }, userId: user.id },
      select: { id: true, title: true, stackId: true, projectId: true },
    })

    if (screenplays.length !== 2) {
      throw new ForbiddenError("One or more screenplays not found or access denied")
    }

    const draggedScreenplay = screenplays.find((s) => s.id === draggedId)!
    const targetScreenplay = screenplays.find((s) => s.id === targetId)!

    if (targetScreenplay.stackId) {
      const existingStack = await prisma.stack.findFirst({
        where: { id: targetScreenplay.stackId, userId: user.id },
      })

      if (existingStack) {
        await prisma.screenplay.update({
          where: { id: draggedId },
          data: { stackId: existingStack.id },
        })

        const updatedStack = await prisma.stack.findUnique({
          where: { id: existingStack.id },
          include: {
            screenplays: {
              select: { id: true, title: true, wordCount: true, updatedAt: true, type: true },
              orderBy: { updatedAt: "desc" },
            },
            project: { select: { id: true, name: true } },
            _count: { select: { screenplays: true } },
          },
        })

        return { stack: updatedStack, action: "added_to_existing" }
      }
    }

    if (draggedScreenplay.stackId) {
      await prisma.screenplay.update({
        where: { id: draggedId },
        data: { stackId: null },
      })

      const oldStackCount = await prisma.screenplay.count({
        where: { stackId: draggedScreenplay.stackId },
      })

      if (oldStackCount <= 1) {
        if (oldStackCount === 1) {
          await prisma.screenplay.updateMany({
            where: { stackId: draggedScreenplay.stackId },
            data: { stackId: null },
          })
        }
        await prisma.stack.delete({ where: { id: draggedScreenplay.stackId } })
      }
    }

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

    const effectiveProjectId =
      projectId || targetScreenplay.projectId || draggedScreenplay.projectId || null

    const stack = await prisma.stack.create({
      data: {
        name: `${targetScreenplay.title} Stack`,
        userId: user.id,
        projectId: effectiveProjectId,
        screenplays: { connect: [{ id: draggedId }, { id: targetId }] },
      },
      include: {
        screenplays: {
          select: { id: true, title: true, wordCount: true, updatedAt: true, type: true },
          orderBy: { updatedAt: "desc" },
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
        metadata: { screenplayIds: [draggedId, targetId] },
      },
    })

    return { stack, action: "created_new" }
  },
})
