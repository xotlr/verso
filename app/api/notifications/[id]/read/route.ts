import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"

export const PATCH = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    // Get notification
    const { data: notification, error: fetchError } = await supabase
      .from("Notification")
      .select("id, userId")
      .eq("id", id)
      .single()

    if (fetchError?.code === "PGRST116" || !notification) {
      throw new NotFoundError("Notification")
    }
    if (fetchError) handleSupabaseError(fetchError, "Notification")

    if (notification.userId !== user.id) {
      throw new ForbiddenError()
    }

    // Update notification
    const { data: updated, error: updateError } = await supabase
      .from("Notification")
      .update({ isRead: true })
      .eq("id", id)
      .select()
      .single()

    if (updateError) handleSupabaseError(updateError, "Notification")

    return { notification: updated }
  },
})
