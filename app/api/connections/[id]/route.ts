import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const updateConnectionSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateConnectionSchema,
  handler: async ({ user, params, data }) => {
    const { id: connectionId } = params
    const { status } = data

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      throw new NotFoundError("Connection")
    }

    if (connection.addresseeId !== user.id) {
      throw new ForbiddenError("Only the recipient can respond to this request")
    }

    if (connection.status !== "PENDING") {
      throw new BadRequestError("This request has already been processed")
    }

    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: { status },
    })

    return {
      connection: updated,
      message: status === "ACCEPTED" ? "Connection accepted" : "Connection declined",
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: connectionId } = params

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      throw new NotFoundError("Connection")
    }

    if (connection.requesterId !== user.id && connection.addresseeId !== user.id) {
      throw new ForbiddenError()
    }

    await prisma.connection.delete({
      where: { id: connectionId },
    })

    return {
      message: connection.status === "PENDING" ? "Request cancelled" : "Connection removed",
    }
  },
})
