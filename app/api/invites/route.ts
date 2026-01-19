import { createApiHandler, UnauthorizedError } from "@/lib/api"

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

    if (error) throw error

    // Add member counts
    const invitesWithCounts = await Promise.all(
      (invites || []).map(async (invite: InviteData) => {
        if (!invite.team) return invite
        const { count } = await supabase
          .from("TeamMember")
          .select("*", { count: "exact", head: true })
          .eq("teamId", invite.team.id)
        return {
          ...invite,
          team: {
            ...invite.team,
            _count: { members: count || 0 },
          },
        }
      })
    )

    return invitesWithCounts
  },
})
