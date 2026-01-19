import { z } from "zod"
import { createApiHandler, NotFoundError, handleSupabaseError } from "@/lib/api"

const publishSchema = z.object({
  isPublic: z.boolean(),
  genre: z.string().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .select("id, isPublic, genre, publishedAt, views")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (error) handleSupabaseError(error, "Screenplay")
    if (!screenplay) throw new NotFoundError("Screenplay")

    return screenplay
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: publishSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const { data: screenplay, error: fetchError } = await supabase
      .from("Screenplay")
      .select("id, publishedAt")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (fetchError) handleSupabaseError(fetchError, "Screenplay")
    if (!screenplay) throw new NotFoundError("Screenplay")

    const { isPublic, genre } = data

    const { data: updated, error: updateError } = await supabase
      .from("Screenplay")
      .update({
        isPublic,
        genre: genre || null,
        publishedAt: isPublic ? (screenplay.publishedAt || new Date().toISOString()) : null,
      })
      .eq("id", id)
      .select("id, isPublic, genre, publishedAt, views")
      .single()

    if (updateError) handleSupabaseError(updateError, "Screenplay")

    return updated
  },
})
