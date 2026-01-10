import { NextResponse } from "next/server"
import { createApiHandler, NotFoundError, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ params }) => {
    const { token } = params

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
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
    })

    if (!invite) {
      throw new NotFoundError("Invite")
    }

    if (new Date() > invite.expiresAt) {
      await prisma.teamInvite.delete({ where: { token } })
      return NextResponse.json({ error: "This invite has expired" }, { status: 410 })
    }

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      team: invite.team,
      inviter: invite.inviter,
    }
  },
})
