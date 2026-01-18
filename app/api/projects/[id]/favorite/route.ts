import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    })

    if (!project) {
      throw new NotFoundError("Project")
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { isFavorite: !project.isFavorite },
      select: { id: true, isFavorite: true },
    })

    return updated
  },
})
