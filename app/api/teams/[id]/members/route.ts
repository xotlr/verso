import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { logTeamAction } from "@/lib/audit-log"

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    // Check membership - RLS also enforces this
    const { data: membership } = await supabase
      .from("TeamMember")
      .select("role")
      .eq("teamId", id)
      .eq("userId", user.id)
      .single()

    if (!membership) {
      throw new ForbiddenError("Access denied")
    }

    const { data: members, error } = await supabase
      .from("TeamMember")
      .select(`
        id, role, userId, createdAt,
        user:User(id, name, email, image)
      `)
      .eq("teamId", id)
      .order("createdAt", { ascending: true })

    if (error) throw error

    return members || []
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: addMemberSchema,
  handler: async ({ user, params, data, supabase }) => {
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
      .select("ownerId, maxSeats")
      .eq("id", id)
      .single()

    if (teamError?.code === "PGRST116" || !team) {
      throw new NotFoundError("Team")
    }
    if (teamError) throw teamError

    const canInvite =
      team.ownerId === user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"))

    if (!canInvite) {
      throw new ForbiddenError("Only owners and admins can invite members")
    }

    // Check seat limits
    const [memberCountResult, inviteCountResult] = await Promise.all([
      supabase
        .from("TeamMember")
        .select("*", { count: "exact", head: true })
        .eq("teamId", id),
      supabase
        .from("TeamInvite")
        .select("*", { count: "exact", head: true })
        .eq("teamId", id),
    ])

    const memberCount = memberCountResult.count || 0
    const inviteCount = inviteCountResult.count || 0
    const totalSeats = memberCount + inviteCount

    if (totalSeats >= team.maxSeats) {
      throw new ForbiddenError(
        `Team has reached the maximum of ${team.maxSeats} seats. Upgrade to add more members.`
      )
    }

    // Find user to add
    const { data: userToAdd, error: userError } = await supabase
      .from("User")
      .select("id, name")
      .eq("email", data.email)
      .single()

    if (userError?.code === "PGRST116" || !userToAdd) {
      throw new NotFoundError("User not found. They need to create an account first.")
    }
    if (userError) throw userError

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from("TeamMember")
      .select("id")
      .eq("teamId", id)
      .eq("userId", userToAdd.id)
      .single()

    if (existingMembership) {
      throw new BadRequestError("User is already a member of this team")
    }

    // Add member
    const { data: newMember, error: insertError } = await supabase
      .from("TeamMember")
      .insert({
        teamId: id,
        userId: userToAdd.id,
        role: data.role,
      })
      .select(`
        id, role, userId, createdAt,
        user:User(id, name, email, image)
      `)
      .single()

    if (insertError) throw insertError

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "member_added",
      targetType: "member",
      targetId: userToAdd.id,
      metadata: { email: data.email, role: data.role, userName: userToAdd.name },
    })

    return newMember
  },
})
