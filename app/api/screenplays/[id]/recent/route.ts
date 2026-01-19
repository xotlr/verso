import { createApiHandler, NotFoundError } from "@/lib/api"

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    // Get user's team memberships
    const { data: memberships } = await supabase
      .from("TeamMember")
      .select("teamId")
      .eq("userId", user.id)

    const teamIds = (memberships || []).map((m: { teamId: string }) => m.teamId)

    // Check if user has access to screenplay
    let query = supabase
      .from("Screenplay")
      .select("id")
      .eq("id", id)

    if (teamIds.length > 0) {
      query = query.or(`userId.eq.${user.id},teamId.in.(${teamIds.join(",")})`)
    } else {
      query = query.eq("userId", user.id)
    }

    const { data: screenplay, error } = await query.single()

    if (error?.code === "PGRST116" || !screenplay) {
      throw new NotFoundError("Screenplay")
    }
    if (error) throw error

    await supabase
      .from("Screenplay")
      .update({ lastOpenedAt: null })
      .eq("id", id)

    return { success: true }
  },
})
