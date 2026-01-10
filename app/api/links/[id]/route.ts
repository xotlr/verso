import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function hasLinkAccess(linkId: string, userId: string): Promise<boolean> {
  const link = await prisma.externalLink.findUnique({
    where: { id: linkId },
    include: {
      project: {
        include: {
          team: {
            include: {
              members: { where: { userId } },
            },
          },
        },
      },
    },
  })

  if (!link) return false
  if (link.userId === userId) return true
  if (link.project.userId === userId) return true
  if (link.project.team && link.project.team.members.length > 0) return true

  return false
}

const updateLinkSchema = z.object({
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const hasAccess = await hasLinkAccess(id, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Link")
    }

    const link = await prisma.externalLink.findUnique({
      where: { id },
    })

    return link
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateLinkSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const hasAccess = await hasLinkAccess(id, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Link")
    }

    const link = await prisma.externalLink.update({
      where: { id },
      data,
    })

    return link
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const hasAccess = await hasLinkAccess(id, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Link")
    }

    await prisma.externalLink.delete({ where: { id } })

    return { success: true }
  },
})
