import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, searchParams }) => {
    const { id } = params

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: user.id } },
    })

    const team = await prisma.team.findUnique({
      where: { id },
    })

    if (!team) {
      throw new NotFoundError("Team")
    }

    const canViewAudit =
      team.ownerId === user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"))

    if (!canViewAudit) {
      throw new ForbiddenError("Only owners and admins can view audit logs")
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const cursor = searchParams.get("cursor")
    const action = searchParams.get("action")

    const where = {
      teamId: id,
      ...(action && { action }),
    }

    const auditLogs = await prisma.teamAuditLog.findMany({
      where,
      include: {
        actor: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    })

    let nextCursor: string | null = null
    if (auditLogs.length > limit) {
      const nextItem = auditLogs.pop()
      nextCursor = nextItem?.id || null
    }

    return {
      logs: auditLogs,
      nextCursor,
      hasMore: nextCursor !== null,
    }
  },
})
