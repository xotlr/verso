import { z } from "zod"
import { createApiHandler, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ searchParams }) => {
    const queryResult = activityQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
    })

    if (!queryResult.success) {
      return { error: "Invalid query parameters" }
    }

    const { limit } = queryResult.data

    const activities = await prisma.activity.findMany({
      where: { type: "screenplay_published" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        entityId: true,
        entityTitle: true,
        createdAt: true,
        user: { select: { id: true, name: true, image: true } },
      },
    })

    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        if (activity.type === "screenplay_published" && activity.entityId) {
          const screenplay = await prisma.screenplay.findUnique({
            where: { id: activity.entityId },
            select: { id: true, title: true, synopsis: true, genre: true, isPublic: true },
          })

          if (screenplay?.isPublic) {
            return { ...activity, screenplay }
          }
          return null
        }
        return activity
      })
    )

    return { activities: enrichedActivities.filter(Boolean) }
  },
})
