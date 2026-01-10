import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const PATCH = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      throw new NotFoundError("Notification")
    }

    if (notification.userId !== user.id) {
      throw new ForbiddenError()
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return { notification: updated }
  },
})
