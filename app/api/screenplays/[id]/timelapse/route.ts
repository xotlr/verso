import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const updateSettingsSchema = z.object({
  enabled: z.boolean().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: screenplayId } = params

    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id: screenplayId,
        userId: user.id,
      },
      select: {
        id: true,
        title: true,
        timelapseEnabled: true,
        timelapseStarted: true,
        timelapseShareId: true,
        _count: {
          select: {
            operations: true,
          },
        },
      },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    const [firstOp, lastOp] = await Promise.all([
      prisma.screenplayOperation.findFirst({
        where: { screenplayId },
        orderBy: { timestamp: "asc" },
        select: { timestamp: true },
      }),
      prisma.screenplayOperation.findFirst({
        where: { screenplayId },
        orderBy: { timestamp: "desc" },
        select: { timestamp: true },
      }),
    ])

    return {
      enabled: screenplay.timelapseEnabled,
      started: screenplay.timelapseStarted,
      shareId: screenplay.timelapseShareId,
      shareUrl: screenplay.timelapseShareId ? `/timelapse/${screenplay.timelapseShareId}` : null,
      operationCount: screenplay._count.operations,
      firstOperationAt: firstOp?.timestamp || null,
      lastOperationAt: lastOp?.timestamp || null,
      durationMs: firstOp && lastOp
        ? new Date(lastOp.timestamp).getTime() - new Date(firstOp.timestamp).getTime()
        : 0,
    }
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateSettingsSchema,
  handler: async ({ user, params, data }) => {
    const { id: screenplayId } = params

    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id: screenplayId,
        userId: user.id,
      },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    const updated = await prisma.screenplay.update({
      where: { id: screenplayId },
      data: {
        timelapseEnabled: data.enabled,
      },
      select: {
        timelapseEnabled: true,
        timelapseStarted: true,
        timelapseShareId: true,
      },
    })

    return {
      enabled: updated.timelapseEnabled,
      started: updated.timelapseStarted,
      shareId: updated.timelapseShareId,
    }
  },
})
