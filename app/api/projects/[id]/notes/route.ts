import { z } from "zod"
import { createApiHandler, NotFoundError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { hasProjectAccess, requirePermission } from "@/lib/project-access"

const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().default(""),
  category: z.string().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(supabase, projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: notes, error } = await supabase
      .from("Note")
      .select("*")
      .eq("projectId", projectId)
      .order("updatedAt", { ascending: false })

    if (error) handleSupabaseError(error, "Note")

    return notes
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createNoteSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    // Require editor permission to create notes
    await requirePermission(supabase, projectId, user.id, "editor")

    const { data: note, error } = await supabase
      .from("Note")
      .insert({
        ...data,
        userId: user.id,
        projectId,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error, "Note")

    return note
  },
})
