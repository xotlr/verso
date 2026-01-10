import { createApiHandler, NotFoundError, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ params }) => {
    const { id } = params

    const screenplay = await prisma.screenplay.findFirst({
      where: { id, isPublic: true },
      select: {
        id: true,
        title: true,
        content: true,
        synopsis: true,
        genre: true,
        views: true,
        publishedAt: true,
        user: { select: { id: true, name: true, image: true, bio: true } },
      },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay not found or not public")
    }

    prisma.screenplay
      .update({ where: { id }, data: { views: { increment: 1 } } })
      .catch((err) => logger.error("Failed to increment view count", err instanceof Error ? err : undefined))

    return screenplay
  },
})
