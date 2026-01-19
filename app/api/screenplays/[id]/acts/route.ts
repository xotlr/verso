import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { DEFAULT_ACTS } from "@/types/beat-board"

const actConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

const actsSchema = z.array(actConfigSchema).min(1).max(10)

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    // Fetch screenplay to get acts
    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .select("acts")
      .eq("id", id)
      .single()

    if (error) handleSupabaseError(error, "Screenplay")
    if (!screenplay) throw new NotFoundError("Screenplay")

    return screenplay.acts || DEFAULT_ACTS
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: actsSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: screenplay, error: updateError } = await supabase
      .from("Screenplay")
      .update({ acts: data })
      .eq("id", id)
      .select("acts")
      .single()

    if (updateError) handleSupabaseError(updateError, "Act")

    return screenplay.acts
  },
})
