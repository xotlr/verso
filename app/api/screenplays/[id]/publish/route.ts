import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const publishSchema = z.object({
  isPublic: z.boolean(),
  genre: z.string().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        isPublic: true,
        genre: true,
        publishedAt: true,
        views: true,
      },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    return screenplay
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: publishSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    const { isPublic, genre } = data

    const updated = await prisma.screenplay.update({
      where: { id },
      data: {
        isPublic,
        genre: genre || null,
        publishedAt: isPublic ? (screenplay.publishedAt || new Date()) : null,
      },
      select: {
        id: true,
        isPublic: true,
        genre: true,
        publishedAt: true,
        views: true,
      },
    })

    return updated
  },
})
