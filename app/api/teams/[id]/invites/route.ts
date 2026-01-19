import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { logTeamAction } from "@/lib/audit-log"

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
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
    if (teamError) handleSupabaseError(teamError, "Invite")

    const isMember = membership || team.ownerId === user.id
    if (!isMember) {
      throw new ForbiddenError("Access denied")
    }

    const { data: invites, error } = await supabase
      .from("TeamInvite")
      .select(`
        id, email, role, expiresAt, createdAt, invitedBy,
        inviter:User!invitedBy(id, name, email, image)
      `)
      .eq("teamId", id)
      .order("createdAt", { ascending: false })

    if (error) handleSupabaseError(error, "Invite")

    return invites || []
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createInviteSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    // Check membership
    const { data: membership } = await supabase
      .from("TeamMember")
      .select("role")
      .eq("teamId", id)
      .eq("userId", user.id)
      .single()

    // Check team exists and get seat info
    const { data: team, error: teamError } = await supabase
      .from("Team")
      .select("ownerId, maxSeats")
      .eq("id", id)
      .single()

    if (teamError?.code === "PGRST116" || !team) {
      throw new NotFoundError("Team")
    }
    if (teamError) handleSupabaseError(teamError, "Invite")

    const canInvite =
      team.ownerId === user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"))

    if (!canInvite) {
      throw new ForbiddenError("Only owners and admins can invite members")
    }

    // Check if user already exists and is a member
    const { data: existingUser } = await supabase
      .from("User")
      .select("id")
      .eq("email", data.email)
      .single()

    if (existingUser) {
      const { data: existingMembership } = await supabase
        .from("TeamMember")
        .select("id")
        .eq("teamId", id)
        .eq("userId", existingUser.id)
        .single()

      if (existingMembership) {
        throw new BadRequestError("User is already a member of this team")
      }
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
        "Team has reached its seat limit. Upgrade to add more members."
      )
    }

    // Check for existing invite
    const { data: existingInvite } = await supabase
      .from("TeamInvite")
      .select("id")
      .eq("teamId", id)
      .eq("email", data.email)
      .single()

    if (existingInvite) {
      throw new BadRequestError("An invite has already been sent to this email")
    }

    // Create invite
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invite, error: insertError } = await supabase
      .from("TeamInvite")
      .insert({
        teamId: id,
        email: data.email,
        role: data.role,
        expiresAt: expiresAt.toISOString(),
        invitedBy: user.id,
      })
      .select(`
        id, email, role, expiresAt, createdAt, invitedBy,
        inviter:User!invitedBy(id, name, email, image),
        team:Team(id, name, logo)
      `)
      .single()

    if (insertError) handleSupabaseError(insertError, "Invite")

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "invite_sent",
      targetType: "invite",
      targetId: invite.id,
      metadata: { email: data.email, role: data.role },
    })

    return invite
  },
})
