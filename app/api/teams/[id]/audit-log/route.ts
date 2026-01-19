import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, searchParams, supabase }) => {
    const { id } = params

    // Check membership
    const { data: membership } = await supabase
      .from("TeamMember")
      .select("role")
      .eq("teamId", id)
      .eq("userId", user.id)
      .single()

    // Check team exists
    const { data: team, error: teamError } = await supabase
      .from("Team")
      .select("ownerId")
      .eq("id", id)
      .single()

    if (teamError?.code === "PGRST116" || !team) {
      throw new NotFoundError("Team")
    }
    if (teamError) handleSupabaseError(teamError, "AuditLog")

    const canViewAudit =
      team.ownerId === user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"))

    if (!canViewAudit) {
      throw new ForbiddenError("Only owners and admins can view audit logs")
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const cursor = searchParams.get("cursor")
    const action = searchParams.get("action")

    // Build query
    let query = supabase
      .from("TeamAuditLog")
      .select(`
        id, action, targetType, targetId, metadata, createdAt,
        actor:User!actorId(id, name, email, image)
      `)
      .eq("teamId", id)
      .order("createdAt", { ascending: false })
      .limit(limit + 1)

    if (action) {
      query = query.eq("action", action)
    }

    if (cursor) {
      // For cursor pagination, we need to get items after the cursor
      const { data: cursorItem } = await supabase
        .from("TeamAuditLog")
        .select("createdAt")
        .eq("id", cursor)
        .single()

      if (cursorItem) {
        query = query.lt("createdAt", cursorItem.createdAt)
      }
    }

    const { data: auditLogs, error } = await query

    if (error) handleSupabaseError(error, "AuditLog")

    let nextCursor: string | null = null
    const logs = auditLogs || []

    if (logs.length > limit) {
      const nextItem = logs.pop()
      nextCursor = nextItem?.id || null
    }

    return {
      logs,
      nextCursor,
      hasMore: nextCursor !== null,
    }
  },
})
