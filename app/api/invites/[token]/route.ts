import { NextResponse } from "next/server"
import { createApiHandler, NotFoundError, RATE_LIMITS } from "@/lib/api"

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ params, supabase }) => {
    const { token } = params

    const { data: invite, error } = await supabase
      .from("TeamInvite")
      .select(`
        id, email, role, expiresAt, teamId,
        team:Team(id, name, logo, description),
        inviter:User!inviterId(id, name, image)
      `)
      .eq("token", token)
      .single()

    if (error?.code === "PGRST116" || !invite) {
      throw new NotFoundError("Invite")
    }
    if (error) throw error

    if (new Date() > new Date(invite.expiresAt)) {
      await supabase.from("TeamInvite").delete().eq("token", token)
      return NextResponse.json({ error: "This invite has expired" }, { status: 410 })
    }

    // Get member count for team
    let teamWithCount = invite.team
    if (invite.team) {
      const { count } = await supabase
        .from("TeamMember")
        .select("*", { count: "exact", head: true })
        .eq("teamId", invite.team.id)
      teamWithCount = {
        ...invite.team,
        _count: { members: count || 0 },
      }
    }

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      team: teamWithCount,
      inviter: invite.inviter,
    }
  },
})
