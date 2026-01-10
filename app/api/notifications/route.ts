import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams }) => {
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: user.id,
          ...(unreadOnly && { isRead: false }),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      }),
    ])

    return { notifications, unreadCount }
  },
})
