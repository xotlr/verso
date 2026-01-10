import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError, UnauthorizedError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

const recordOperationSchema = z.object({
  operations: z.array(z.object({
    operationType: z.enum(["insert", "delete", "replace"]),
    position: z.number().nullable().optional(),
    content: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })),
})

export const POST = createApiHandler({
  auth: "required",
  schema: recordOperationSchema,
  handler: async ({ user, params, data }) => {
    const { id: screenplayId } = params

    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id: screenplayId,
        userId: user.id,
      },
      select: {
        timelapseEnabled: true,
        timelapseStarted: true,
      },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    if (!screenplay.timelapseEnabled) {
      throw new BadRequestError("Timelapse recording is disabled")
    }

    if (!screenplay.timelapseStarted) {
      await prisma.screenplay.update({
        where: { id: screenplayId },
        data: { timelapseStarted: new Date() },
      })
    }

    const operations = data.operations.map((op) => ({
      screenplayId,
      userId: user.id,
      operationType: op.operationType,
      position: op.position ?? null,
      content: op.content ?? null,
      metadata: op.metadata ? (op.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    }))

    await prisma.screenplayOperation.createMany({
      data: operations,
    })

    return { success: true, count: operations.length }
  },
})

// GET - mixed auth (owner OR public timelapse) - custom handler needed
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id: screenplayId } = await params
  try {
    const { searchParams } = new URL(request.url)

    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000"), 5000)
    const fromTimestamp = searchParams.get("from")
    const toTimestamp = searchParams.get("to")

    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id: screenplayId,
        OR: [
          { userId: session?.user?.id || "" },
          { timelapseShareId: { not: null } },
        ],
      },
      select: {
        id: true,
        userId: true,
        timelapseEnabled: true,
        timelapseStarted: true,
        timelapseShareId: true,
      },
    })

    if (!screenplay) {
      return NextResponse.json({ error: "Screenplay not found" }, { status: 404 })
    }

    if (screenplay.userId !== session?.user?.id && !screenplay.timelapseShareId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const where: {
      screenplayId: string
      sequenceNumber?: { gt: bigint }
      timestamp?: { gte?: Date; lte?: Date }
    } = {
      screenplayId,
    }

    if (cursor) {
      where.sequenceNumber = { gt: BigInt(cursor) }
    }

    if (fromTimestamp || toTimestamp) {
      where.timestamp = {}
      if (fromTimestamp) where.timestamp.gte = new Date(fromTimestamp)
      if (toTimestamp) where.timestamp.lte = new Date(toTimestamp)
    }

    const operations = await prisma.screenplayOperation.findMany({
      where,
      orderBy: { sequenceNumber: "asc" },
      take: limit,
      select: {
        id: true,
        operationType: true,
        position: true,
        content: true,
        metadata: true,
        timestamp: true,
        sequenceNumber: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    const totalCount = await prisma.screenplayOperation.count({
      where: { screenplayId },
    })

    const serializedOperations = operations.map((op) => ({
      ...op,
      sequenceNumber: op.sequenceNumber.toString(),
    }))

    const nextCursor = operations.length === limit
      ? operations[operations.length - 1].sequenceNumber.toString()
      : null

    return NextResponse.json({
      operations: serializedOperations,
      nextCursor,
      totalCount,
      timelapseStarted: screenplay.timelapseStarted,
    })
  } catch (error) {
    logger.error("Failed to fetch timelapse operations", error instanceof Error ? error : undefined, {
      screenplayId,
      userId: session?.user?.id,
    })
    return NextResponse.json(
      { error: "Failed to fetch operations" },
      { status: 500 }
    )
  }
}

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
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

    await prisma.screenplayOperation.deleteMany({
      where: { screenplayId },
    })

    await prisma.screenplay.update({
      where: { id: screenplayId },
      data: {
        timelapseStarted: null,
        timelapseShareId: null,
      },
    })

    return { success: true }
  },
})
