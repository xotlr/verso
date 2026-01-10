import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const screenplay = await prisma.screenplay.findFirst({
      where: { id, userId: user.id },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    const updated = await prisma.screenplay.update({
      where: { id },
      data: { isFavorite: !screenplay.isFavorite },
      select: { id: true, isFavorite: true },
    })

    return updated
  },
})
