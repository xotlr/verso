import { createApiHandler, NotFoundError, handleSupabaseError } from "@/lib/api"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const { data: project, error: fetchError } = await supabase
      .from("Project")
      .select("id, isFavorite")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (fetchError?.code === "PGRST116" || !project) {
      throw new NotFoundError("Project")
    }
    if (fetchError) handleSupabaseError(fetchError, "Project")

    const { data: updated, error: updateError } = await supabase
      .from("Project")
      .update({ isFavorite: !project.isFavorite })
      .eq("id", id)
      .select("id, isFavorite")
      .single()

    if (updateError) handleSupabaseError(updateError, "Project")

    return updated
  },
})
