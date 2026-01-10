import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    const requests = await prisma.connection.findMany({
      where: {
        addresseeId: user.id,
        status: "PENDING",
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            title: true,
            location: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return {
      requests: requests.map((req) => ({
        id: req.id,
        createdAt: req.createdAt,
        user: req.requester,
      })),
    }
  },
})
