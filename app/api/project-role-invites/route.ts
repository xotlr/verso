import { createApiHandler, UnauthorizedError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    if (!user.email) {
      throw new UnauthorizedError("Email required")
    }

    const invites = await prisma.projectRoleInvite.findMany({
      where: {
        email: user.email.toLowerCase(),
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        expiresAt: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            name: true,
            logo: true,
            banner: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return invites
  },
})
