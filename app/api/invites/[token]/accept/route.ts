import { NextResponse } from "next/server"
import { createApiHandler, UnauthorizedError, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { logTeamAction } from "@/lib/audit-log"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { token } = params

    if (!user.email) {
      throw new UnauthorizedError("You must be logged in to accept an invite")
    }

    const { data: invite, error: inviteError } = await supabase
      .from("TeamInvite")
      .select(`
        id, email, role, expiresAt, teamId,
        team:Team(id, name, logo, maxSeats)
      `)
      .eq("token", token)
      .single()

    if (inviteError?.code === "PGRST116" || !invite) {
      throw new NotFoundError("Invite")
    }
    if (inviteError) throw inviteError

    if (new Date() > new Date(invite.expiresAt)) {
      await supabase.from("TeamInvite").delete().eq("token", token)
      return NextResponse.json({ error: "This invite has expired" }, { status: 410 })
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError("This invite was sent to a different email address")
    }

    const { data: existingMembership } = await supabase
      .from("TeamMember")
      .select("id")
      .eq("teamId", invite.teamId)
      .eq("userId", user.id)
      .single()

    if (existingMembership) {
      await supabase.from("TeamInvite").delete().eq("token", token)
      throw new BadRequestError("You are already a member of this team")
    }

    // Check seat limit
    const { count: currentMemberCount } = await supabase
      .from("TeamMember")
      .select("*", { count: "exact", head: true })
      .eq("teamId", invite.teamId)

    if ((currentMemberCount || 0) >= (invite.team?.maxSeats || 0)) {
      throw new ForbiddenError("Team has reached its seat limit")
    }

    // Create membership
    const { data: member, error: memberError } = await supabase
      .from("TeamMember")
      .insert({
        teamId: invite.teamId,
        userId: user.id,
        role: invite.role,
      })
      .select(`
        id, teamId, userId, role,
        team:Team(id, name, logo),
        user:User(id, name, email, image)
      `)
      .single()

    if (memberError) throw memberError

    // Delete the invite
    await supabase.from("TeamInvite").delete().eq("token", token)

    await logTeamAction({
      teamId: invite.teamId,
      actorId: user.id,
      action: "invite_accepted",
      targetType: "member",
      targetId: user.id,
      metadata: {
        inviteId: invite.id,
        role: invite.role,
        teamName: member.team?.name || "",
      },
    })

    return { success: true, membership: member }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { token } = params

    if (!user.email) {
      throw new UnauthorizedError("You must be logged in to decline an invite")
    }

    const { data: invite, error: inviteError } = await supabase
      .from("TeamInvite")
      .select("id, email, teamId")
      .eq("token", token)
      .single()

    if (inviteError?.code === "PGRST116" || !invite) {
      throw new NotFoundError("Invite")
    }
    if (inviteError) throw inviteError

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError("This invite was sent to a different email address")
    }

    const teamId = invite.teamId

    await supabase.from("TeamInvite").delete().eq("token", token)

    await logTeamAction({
      teamId,
      actorId: user.id,
      action: "invite_declined",
      targetType: "invite",
      targetId: invite.id,
      metadata: { email: invite.email },
    })

    return { success: true }
  },
})
