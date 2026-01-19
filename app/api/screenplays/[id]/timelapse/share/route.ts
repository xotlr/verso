import { createApiHandler, NotFoundError, BadRequestError } from "@/lib/api"
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

    if (error?.code === "PGRST116" || !screenplay) {
      throw new NotFoundError("Screenplay")
    }
    if (error) throw error

    if (!screenplay.timelapseStarted) {
      throw new BadRequestError("No timelapse recording exists for this screenplay")
    }

    const shareId = createId()

    const { error: updateError } = await supabase
      .from("Screenplay")
      .update({ timelapseShareId: shareId })
      .eq("id", screenplayId)

    if (updateError) throw updateError

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

    if (error?.code === "PGRST116" || !screenplay) {
      throw new NotFoundError("Screenplay")
    }
    if (error) throw error

    const { error: updateError } = await supabase
      .from("Screenplay")
      .update({ timelapseShareId: null })
      .eq("id", screenplayId)

    if (updateError) throw updateError

    return { success: true }
  },
})
