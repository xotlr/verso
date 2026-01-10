import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          { team: { members: { some: { userId: user.id } } } },
        ],
      },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    await prisma.screenplay.update({
      where: { id },
      data: { lastOpenedAt: null },
    })

    return { success: true }
  },
})
