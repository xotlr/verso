import { createApiHandler } from "@/lib/api"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams, supabase }) => {
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    // Build notifications query
    let notificationsQuery = supabase
      .from("Notification")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      notificationsQuery = notificationsQuery.eq("isRead", false)
    }

    // Get unread count
    const unreadCountQuery = supabase
      .from("Notification")
      .select("*", { count: "exact", head: true })
      .eq("userId", user.id)
      .eq("isRead", false)

    const [notificationsResult, unreadCountResult] = await Promise.all([
      notificationsQuery,
      unreadCountQuery,
    ])

    if (notificationsResult.error) throw notificationsResult.error
    if (unreadCountResult.error) throw unreadCountResult.error

    return {
      notifications: notificationsResult.data || [],
      unreadCount: unreadCountResult.count || 0,
    }
  },
})
