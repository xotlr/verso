import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const publishSchema = z.object({
  isPublic: z.boolean(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        isPublic: true,
        publishedAt: true,
      },
    })

    if (!project) {
      throw new NotFoundError("Project not found or access denied")
    }

    return project
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: publishSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    })

    if (!project) {
      throw new NotFoundError("Project not found or access denied")
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        isPublic: data.isPublic,
        publishedAt: data.isPublic ? (project.publishedAt || new Date()) : null,
      },
      select: {
        id: true,
        isPublic: true,
        publishedAt: true,
      },
    })

    return updated
  },
})
