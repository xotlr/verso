import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function checkNoteAccess(noteId: string, userId: string) {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
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

  if (!note) {
    return { allowed: false, note: null, reason: "not_found" as const }
  }

  if (note.userId === userId) {
    return { allowed: true, note, reason: null }
  }

  if (note.project?.team && note.project.team.members.length > 0) {
    return { allowed: true, note, reason: null }
  }

  return { allowed: false, note: null, reason: "forbidden" as const }
}

const updateNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  category: z.string().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params
    const access = await checkNoteAccess(id, user.id)

    if (!access.allowed) {
      if (access.reason === "not_found") throw new NotFoundError("Note")
      throw new ForbiddenError()
    }

    return access.note
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateNoteSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params
    const access = await checkNoteAccess(id, user.id)

    if (!access.allowed) {
      if (access.reason === "not_found") throw new NotFoundError("Note")
      throw new ForbiddenError()
    }

    const note = await prisma.note.update({
      where: { id },
      data,
    })

    return note
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params
    const access = await checkNoteAccess(id, user.id)

    if (!access.allowed) {
      if (access.reason === "not_found") throw new NotFoundError("Note")
      throw new ForbiddenError()
    }

    await prisma.note.delete({ where: { id } })

    return { success: true }
  },
})
