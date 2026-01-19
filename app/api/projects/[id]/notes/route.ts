import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"

async function hasProjectAccess(projectId: string, userId: string, supabase: any): Promise<boolean> {
  const { data: project } = await supabase
    .from("Project")
    .select(`
      id, userId, teamId,
      team:Team(id, members:TeamMember(userId))
    `)
    .eq("id", projectId)
    .single()

  if (!project) return false
  if (project.userId === userId) return true
  if (project.team?.members?.some((m: { userId: string }) => m.userId === userId)) return true

  return false
}

const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().default(""),
  category: z.string().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id, supabase)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: notes, error } = await supabase
      .from("Note")
      .select("*")
      .eq("projectId", projectId)
      .order("updatedAt", { ascending: false })

    if (error) throw error

    return notes
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createNoteSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id, supabase)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: note, error } = await supabase
      .from("Note")
      .insert({
        ...data,
        userId: user.id,
        projectId,
      })
      .select()
      .single()

    if (error) throw error

    return note
  },
})
