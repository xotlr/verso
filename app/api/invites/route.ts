import { createApiHandler, UnauthorizedError, handleSupabaseError } from "@/lib/api"

type InviteData = {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
  teamId: string
  team: {
    id: string
    name: string
    logo: string | null
    description: string | null
  } | null
  inviter: {
    id: string
    name: string | null
    image: string | null
  } | null
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    if (!user.email) {
      throw new UnauthorizedError()
    }

    const { data: invites, error } = await supabase
      .from("TeamInvite")
      .select(`
        id, email, role, expiresAt, createdAt, teamId,
        team:Team(id, name, logo, description),
        inviter:User!inviterId(id, name, image)
      `)
      .eq("email", user.email)
      .gt("expiresAt", new Date().toISOString())
      .order("createdAt", { ascending: false })

    if (error) handleSupabaseError(error, "Invite")

    // Batch fetch all member counts in a single query (fixes N+1)
    const teamIds = (invites || [])
      .map((invite: InviteData) => invite.team?.id)
      .filter((id: string | undefined): id is string => !!id)

    const memberCountMap = new Map<string, number>()

    if (teamIds.length > 0) {
      // Get member counts for all teams in one query
      const { data: memberCounts } = await supabase
        .from("TeamMember")
        .select("teamId")
        .in("teamId", teamIds)

      // Count members per team
      for (const member of memberCounts || []) {
        const count = memberCountMap.get(member.teamId) || 0
        memberCountMap.set(member.teamId, count + 1)
      }
    }

    // Map invites with pre-fetched counts
    const invitesWithCounts = (invites || []).map((invite: InviteData) => {
      if (!invite.team) return invite
      return {
        ...invite,
        team: {
          ...invite.team,
          _count: { members: memberCountMap.get(invite.team.id) || 0 },
        },
      }
    })

    return invitesWithCounts
  },
})
