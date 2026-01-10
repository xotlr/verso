import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const [screenplay, shots] = await Promise.all([
      prisma.screenplay.update({
        where: { id },
        data: { lastOpenedAt: new Date() },
        include: {
          project: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          series: { select: { id: true, title: true } },
          seasonRef: { select: { id: true, number: true, title: true } },
        },
      }),
      prisma.shot.findMany({
        where: { screenplayId: id },
        orderBy: [
          { sceneId: "asc" },
          { shotNumber: "asc" },
        ],
      }),
    ])

    return {
      screenplay,
      shots,
      access: {
        isOwner: access.isOwner,
        shareRole: access.shareRole,
      },
    }
  },
})
