import { createApiHandler, UnauthorizedError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    if (!user.email) {
      throw new UnauthorizedError()
    }

    const invites = await prisma.teamInvite.findMany({
      where: {
        email: user.email,
        expiresAt: { gt: new Date() },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logo: true,
            description: true,
            _count: { select: { members: true } },
          },
        },
        inviter: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return invites
  },
})
