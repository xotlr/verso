import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams }) => {
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20)

    const favorites = await prisma.screenplay.findMany({
      where: {
        userId: user.id,
        isFavorite: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        isFavorite: true,
        project: { select: { id: true, name: true } },
      },
    })

    return favorites
  },
})
