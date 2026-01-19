import { createApiHandler, NotFoundError } from "@/lib/api"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    // Get current state (only owner can favorite)
    const { data: screenplay, error: fetchError } = await supabase
      .from("Screenplay")
      .select("id, isFavorite")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (fetchError?.code === "PGRST116" || !screenplay) {
      throw new NotFoundError("Screenplay")
    }
    if (fetchError) throw fetchError

    // Toggle favorite
    const { data: updated, error: updateError } = await supabase
      .from("Screenplay")
      .update({ isFavorite: !screenplay.isFavorite })
      .eq("id", id)
      .select("id, isFavorite")
      .single()

    if (updateError) throw updateError

    return updated
  },
})
