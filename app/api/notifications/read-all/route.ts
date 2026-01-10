import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: { isRead: true },
    })

    return { success: true }
  },
})
