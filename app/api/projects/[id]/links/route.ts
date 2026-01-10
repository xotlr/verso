import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        include: { members: { where: { userId } } },
      },
    },
  })

  if (!project) return false
  if (project.userId === userId) return true
  if (project.team && project.team.members.length > 0) return true

  return false
}

const createLinkSchema = z.object({
  url: z.string().url("Invalid URL"),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  favicon: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  siteName: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  embedType: z.string().optional().nullable(),
  embedId: z.string().optional().nullable(),
  embedUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  isPlayable: z.boolean().optional().default(false),
  notes: z.string().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const links = await prisma.externalLink.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    })

    return links
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createLinkSchema,
  handler: async ({ user, params, data }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const link = await prisma.externalLink.create({
      data: {
        ...data,
        userId: user.id,
        projectId,
      },
    })

    return link
  },
})
