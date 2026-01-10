import { createApiHandler, NotFoundError, GoneError, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ params }) => {
    const { token } = params

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        screenplay: {
          select: {
            id: true,
            title: true,
            content: true,
            synopsis: true,
            type: true,
            format: true,
            genre: true,
            logline: true,
            author: true,
            wordCount: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!shareLink) {
      throw new NotFoundError("Share link")
    }

    if (!shareLink.isActive) {
      throw new GoneError("This share link has been revoked")
    }

    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      throw new GoneError("This share link has expired")
    }

    // Increment view count (fire and forget)
    prisma.screenplay.update({
      where: { id: shareLink.screenplayId },
      data: { views: { increment: 1 } },
    }).catch((err) => logger.error("Failed to increment view count", err instanceof Error ? err : undefined))

    return {
      screenplay: {
        ...shareLink.screenplay,
        author: shareLink.screenplay.author || shareLink.screenplay.user?.name || "Anonymous",
      },
      permission: shareLink.permission,
      expiresAt: shareLink.expiresAt,
    }
  },
})
