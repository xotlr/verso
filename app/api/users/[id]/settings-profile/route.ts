import { createApiHandler, UnauthorizedError, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    if (user.id !== id) {
      throw new UnauthorizedError()
    }

    const userData = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        banner: true,
        bio: true,
        title: true,
        isPublic: true,
        plan: true,
        location: true,
        website: true,
      },
    })

    if (!userData) {
      throw new NotFoundError("User")
    }

    return userData
  },
})
