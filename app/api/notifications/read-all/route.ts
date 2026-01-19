import { createApiHandler } from "@/lib/api"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    const { error } = await supabase
      .from("Notification")
      .update({ isRead: true })
      .eq("userId", user.id)
      .eq("isRead", false)

    if (error) throw error

    return { success: true }
  },
})
