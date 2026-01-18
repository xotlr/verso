import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const series = await prisma.series.findFirst({
      where: { id, userId: user.id },
    })

    if (!series) {
      throw new NotFoundError("Series")
    }

    const updated = await prisma.series.update({
      where: { id },
      data: { isFavorite: !series.isFavorite },
      select: { id: true, isFavorite: true },
    })

    return updated
  },
})
