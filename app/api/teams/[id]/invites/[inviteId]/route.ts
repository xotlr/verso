import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { logTeamAction } from "@/lib/audit-log"

export const DELETE = createApiHandler({
  auth: "required",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, supabase }) => {
    const { id, inviteId } = params

    // Get invite with team info
    const { data: invite, error: inviteError } = await supabase
      .from("TeamInvite")
      .select(`
        id, email, role, teamId,
        team:Team(ownerId)
      `)
      .eq("id", inviteId)
      .single()

    if (inviteError?.code === "PGRST116" || !invite) {
      throw new NotFoundError("Invite")
    }
    if (inviteError) handleSupabaseError(inviteError, "Invite")

    if (invite.teamId !== id) {
      throw new NotFoundError("Invite")
    }

    // Check membership
    const { data: membership } = await supabase
      .from("TeamMember")
      .select("role")
      .eq("teamId", id)
      .eq("userId", user.id)
      .single()

    const team = invite.team as { ownerId: string } | null
    const canRevoke =
      team?.ownerId === user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"))

    if (!canRevoke) {
      throw new ForbiddenError("Only owners and admins can revoke invites")
    }

    // Delete invite
    const { error: deleteError } = await supabase
      .from("TeamInvite")
      .delete()
      .eq("id", inviteId)

    if (deleteError) handleSupabaseError(deleteError, "Invite")

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "invite_revoked",
      targetType: "invite",
      targetId: inviteId,
      metadata: { email: invite.email, role: invite.role },
    })

    return { success: true }
  },
})
