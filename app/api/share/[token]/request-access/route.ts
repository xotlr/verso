import { z } from "zod"
import { createApiHandler, NotFoundError, GoneError, ConflictError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const requestAccessSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  message: z.string().max(500, "Message too long").optional(),
})

export const POST = createApiHandler({
  auth: "none",
  schema: requestAccessSchema,
  handler: async ({ params, data }) => {
    const { token } = params
    const { email, name, message } = data

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        screenplay: {
          select: {
            id: true,
            title: true,
            userId: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!shareLink) {
      throw new NotFoundError("Share link")
    }

    if (!shareLink.isActive) {
      throw new GoneError("This share link is no longer active")
    }

    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      throw new GoneError("This share link has expired")
    }

    const existingRequest = await prisma.accessRequest.findUnique({
      where: {
        shareLinkId_email: {
          shareLinkId: shareLink.id,
          email: email.toLowerCase(),
        },
      },
    })

    if (existingRequest) {
      if (existingRequest.status === "APPROVED") {
        throw new ConflictError("Access has already been granted to this email")
      }
      if (existingRequest.status === "PENDING") {
        await prisma.accessRequest.update({
          where: { id: existingRequest.id },
          data: {
            name,
            message,
            updatedAt: new Date(),
          },
        })
        return { success: true, updated: true }
      }
      if (existingRequest.status === "DENIED") {
        await prisma.accessRequest.update({
          where: { id: existingRequest.id },
          data: {
            name,
            message,
            status: "PENDING",
            respondedAt: null,
            updatedAt: new Date(),
          },
        })
        return { success: true, resubmitted: true }
      }
    }

    await prisma.accessRequest.create({
      data: {
        shareLinkId: shareLink.id,
        email: email.toLowerCase(),
        name,
        message,
      },
    })

    return { success: true }
  },
})
