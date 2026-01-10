import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams }) => {
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 10)

    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: user.id },
      select: { teamId: true },
    })
    const teamIds = teamMemberships.map((tm) => tm.teamId)

    const recentScreenplays = await prisma.screenplay.findMany({
      where: {
        OR: [{ userId: user.id }, { teamId: { in: teamIds } }],
        lastOpenedAt: { not: null },
      },
      orderBy: { lastOpenedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        lastOpenedAt: true,
        isFavorite: true,
        project: { select: { id: true, name: true } },
      },
    })

    return recentScreenplays
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    await prisma.screenplay.updateMany({
      where: { userId: user.id },
      data: { lastOpenedAt: null },
    })

    return { success: true }
  },
})
