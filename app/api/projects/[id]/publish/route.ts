import { z } from "zod"
import { createApiHandler, NotFoundError, handleSupabaseError } from "@/lib/api"

const publishSchema = z.object({
  isPublic: z.boolean(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const { data: project, error } = await supabase
      .from("Project")
      .select("id, isPublic, publishedAt")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (error) handleSupabaseError(error, "Project")
    if (!project) throw new NotFoundError("Project not found or access denied")

    return project
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: publishSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const { data: project, error: fetchError } = await supabase
      .from("Project")
      .select("id, publishedAt")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (fetchError) handleSupabaseError(fetchError, "Project")
    if (!project) throw new NotFoundError("Project not found or access denied")

    const { data: updated, error: updateError } = await supabase
      .from("Project")
      .update({
        isPublic: data.isPublic,
        publishedAt: data.isPublic ? (project.publishedAt || new Date().toISOString()) : null,
      })
      .eq("id", id)
      .select("id, isPublic, publishedAt")
      .single()

    if (updateError) handleSupabaseError(updateError, "Project")

    return updated
  },
})
