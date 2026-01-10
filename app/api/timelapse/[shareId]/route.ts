import { createApiHandler, NotFoundError, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "none",
  rateLimit: { maxRequests: 100, windowMs: 60 * 1000 },
  handler: async ({ params, searchParams }) => {
    const { shareId } = params

    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000"), 5000)

    const screenplay = await prisma.screenplay.findFirst({
      where: {
        timelapseShareId: shareId,
      },
      select: {
        id: true,
        title: true,
        timelapseStarted: true,
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    })

    if (!screenplay) {
      throw new NotFoundError("Timelapse")
    }

    const where: {
      screenplayId: string
      sequenceNumber?: { gt: bigint }
    } = {
      screenplayId: screenplay.id,
    }

    if (cursor) {
      where.sequenceNumber = { gt: BigInt(cursor) }
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
      },
    })

    const totalCount = await prisma.screenplayOperation.count({
      where: { screenplayId: screenplay.id },
    })

    const serializedOperations = operations.map((op) => ({
      ...op,
      sequenceNumber: op.sequenceNumber.toString(),
    }))

    const nextCursor = operations.length === limit
      ? operations[operations.length - 1].sequenceNumber.toString()
      : null

    return {
      screenplay: {
        title: screenplay.title,
        author: screenplay.user?.name || "Anonymous",
        authorImage: screenplay.user?.image,
      },
      operations: serializedOperations,
      nextCursor,
      totalCount,
      timelapseStarted: screenplay.timelapseStarted,
    }
  },
})
