import { z } from "zod"
import { createApiHandler, BadRequestError, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const createConnectionSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  message: z.string().max(500).optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    const connections = await prisma.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: user.id }, { addresseeId: user.id }],
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
          },
        },
        addressee: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            title: true,
            location: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    const connectedUsers = connections.map((conn) => {
      const otherUser = conn.requesterId === user.id ? conn.addressee : conn.requester
      return {
        connectionId: conn.id,
        connectedAt: conn.updatedAt,
        user: otherUser,
      }
    })

    return { connections: connectedUsers }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createConnectionSchema,
  handler: async ({ user, data }) => {
    const { userId: targetUserId } = data
    const requesterId = user.id

    if (requesterId === targetUserId) {
      throw new BadRequestError("Cannot connect to yourself")
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isPublic: true },
    })

    if (!targetUser) {
      throw new NotFoundError("User")
    }

    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: requesterId },
        ],
      },
    })

    if (existingConnection) {
      if (existingConnection.status === "ACCEPTED") {
        throw new BadRequestError("Already connected")
      }
      if (existingConnection.status === "PENDING") {
        if (existingConnection.requesterId === targetUserId) {
          const updated = await prisma.connection.update({
            where: { id: existingConnection.id },
            data: { status: "ACCEPTED" },
          })
          return { connection: updated, message: "Connection request accepted" }
        }
        throw new BadRequestError("Connection request already sent")
      }
      if (existingConnection.status === "DECLINED") {
        const declinedAt = existingConnection.updatedAt
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        if (declinedAt > sevenDaysAgo) {
          throw new BadRequestError("Cannot send request again yet. Please wait a few days.")
        }

        await prisma.connection.delete({ where: { id: existingConnection.id } })
      }
    }

    const connection = await prisma.connection.create({
      data: {
        requesterId,
        addresseeId: targetUserId,
        status: "PENDING",
      },
    })

    return { connection }
  },
})
