import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"

async function checkNoteAccess(noteId: string, userId: string, supabase: any) {
  // Get note with project and team membership info
  const { data: note, error } = await supabase
    .from("Note")
    .select(`
      id, userId, projectId, title, content, category, createdAt, updatedAt,
      project:Project(
        id, userId, teamId,
        team:Team(
          id,
          members:TeamMember(userId)
        )
      )
    `)
    .eq("id", noteId)
    .single()

  if (error?.code === "PGRST116" || !note) {
    return { allowed: false, note: null, reason: "not_found" as const }
  }
  if (error) throw error

  // Owner has access
  if (note.userId === userId) {
    return { allowed: true, note, reason: null }
  }

  // Check team membership
  if (note.project?.team) {
    const isMember = note.project.team.members?.some(
      (m: { userId: string }) => m.userId === userId
    )
    if (isMember) {
      return { allowed: true, note, reason: null }
    }
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
  handler: async ({ user, params, supabase }) => {
    const { id } = params
    const access = await checkNoteAccess(id, user.id, supabase)

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
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params
    const access = await checkNoteAccess(id, user.id, supabase)

    if (!access.allowed) {
      if (access.reason === "not_found") throw new NotFoundError("Note")
      throw new ForbiddenError()
    }

    const { data: note, error } = await supabase
      .from("Note")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return note
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params
    const access = await checkNoteAccess(id, user.id, supabase)

    if (!access.allowed) {
      if (access.reason === "not_found") throw new NotFoundError("Note")
      throw new ForbiddenError()
    }

    const { error } = await supabase
      .from("Note")
      .delete()
      .eq("id", id)

    if (error) throw error

    return { success: true }
  },
})
