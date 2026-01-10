import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const screenplayIdsSchema = z.object({
  screenplayIds: z.array(z.string()).min(1, "At least one screenplay required"),
})

export const POST = createApiHandler({
  auth: "required",
  schema: screenplayIdsSchema,
  handler: async ({ user, params, data }) => {
    const { id: stackId } = params
    const { screenplayIds } = data

    const stack = await prisma.stack.findFirst({
      where: { id: stackId, userId: user.id },
    })

    if (!stack) {
      throw new NotFoundError("Stack")
    }

    const ownedScreenplays = await prisma.screenplay.count({
      where: { id: { in: screenplayIds }, userId: user.id },
    })

    if (ownedScreenplays !== screenplayIds.length) {
      throw new ForbiddenError("One or more screenplays not found or access denied")
    }

    await prisma.screenplay.updateMany({
      where: { id: { in: screenplayIds } },
      data: {
        stackId,
        ...(stack.projectId && { projectId: stack.projectId }),
      },
    })

    const updatedStack = await prisma.stack.findUnique({
      where: { id: stackId },
      include: {
        screenplays: {
          select: { id: true, title: true, wordCount: true, updatedAt: true, type: true },
          orderBy: { updatedAt: "desc" },
        },
        project: { select: { id: true, name: true } },
        _count: { select: { screenplays: true } },
      },
    })

    return updatedStack
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  schema: screenplayIdsSchema,
  handler: async ({ user, params, data }) => {
    const { id: stackId } = params
    const { screenplayIds } = data

    const stack = await prisma.stack.findFirst({
      where: { id: stackId, userId: user.id },
      include: { _count: { select: { screenplays: true } } },
    })

    if (!stack) {
      throw new NotFoundError("Stack")
    }

    await prisma.screenplay.updateMany({
      where: {
        id: { in: screenplayIds },
        stackId: stackId,
        userId: user.id,
      },
      data: { stackId: null },
    })

    const remainingCount = await prisma.screenplay.count({
      where: { stackId },
    })

    if (remainingCount <= 1) {
      if (remainingCount === 1) {
        await prisma.screenplay.updateMany({
          where: { stackId },
          data: { stackId: null },
        })
      }

      await prisma.stack.delete({ where: { id: stackId } })

      return { success: true, dissolved: true, message: "Stack was automatically dissolved" }
    }

    const updatedStack = await prisma.stack.findUnique({
      where: { id: stackId },
      include: {
        screenplays: {
          select: { id: true, title: true, wordCount: true, updatedAt: true, type: true },
          orderBy: { updatedAt: "desc" },
        },
        project: { select: { id: true, name: true } },
        _count: { select: { screenplays: true } },
      },
    })

    return updatedStack
  },
})
