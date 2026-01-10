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

const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().default(""),
  category: z.string().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const notes = await prisma.note.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
    })

    return notes
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createNoteSchema,
  handler: async ({ user, params, data }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const note = await prisma.note.create({
      data: {
        ...data,
        userId: user.id,
        projectId,
      },
    })

    return note
  },
})
