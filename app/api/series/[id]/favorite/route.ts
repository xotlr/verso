import { createApiHandler, NotFoundError } from "@/lib/api"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const { data: series, error: fetchError } = await supabase
      .from("Series")
      .select("id, isFavorite")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (fetchError?.code === "PGRST116" || !series) {
      throw new NotFoundError("Series")
    }
    if (fetchError) throw fetchError

    const { data: updated, error: updateError } = await supabase
      .from("Series")
      .update({ isFavorite: !series.isFavorite })
      .eq("id", id)
      .select("id, isFavorite")
      .single()

    if (updateError) throw updateError

    return updated
  },
})
