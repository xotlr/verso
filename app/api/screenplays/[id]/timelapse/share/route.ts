import { createApiHandler, NotFoundError, BadRequestError, handleSupabaseError } from "@/lib/api"
import { createId } from "@paralleldrive/cuid2"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: screenplayId } = params

    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .select("id, timelapseEnabled, timelapseStarted, timelapseShareId")
      .eq("id", screenplayId)
      .eq("userId", user.id)
      .single()

    if (error) handleSupabaseError(error, "Screenplay")
    if (!screenplay) throw new NotFoundError("Screenplay")

    if (!screenplay.timelapseStarted) {
      throw new BadRequestError("No timelapse recording exists for this screenplay")
    }

    const shareId = createId()

    const { error: updateError } = await supabase
      .from("Screenplay")
      .update({ timelapseShareId: shareId })
      .eq("id", screenplayId)

    if (updateError) handleSupabaseError(updateError, "Timelapse")

    return {
      shareId,
      shareUrl: `/timelapse/${shareId}`,
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: screenplayId } = params

    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .select("id")
      .eq("id", screenplayId)
      .eq("userId", user.id)
      .single()

    if (error) handleSupabaseError(error, "Screenplay")
    if (!screenplay) throw new NotFoundError("Screenplay")

    const { error: updateError } = await supabase
      .from("Screenplay")
      .update({ timelapseShareId: null })
      .eq("id", screenplayId)

    if (updateError) handleSupabaseError(updateError, "Timelapse")

    return { success: true }
  },
})
