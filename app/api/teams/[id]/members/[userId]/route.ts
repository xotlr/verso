import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { logTeamAction } from "@/lib/audit-log"

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateRoleSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id, userId: targetUserId } = params

    // Get team
    const { data: team, error: teamError } = await supabase
      .from("Team")
      .select("ownerId")
      .eq("id", id)
      .single()

    if (teamError?.code === "PGRST116" || !team) {
      throw new NotFoundError("Team")
    }
    if (teamError) throw teamError

    // Check current user's membership
    const { data: currentMembership } = await supabase
      .from("TeamMember")
      .select("role")
      .eq("teamId", id)
      .eq("userId", user.id)
      .single()

    const canManage =
      team.ownerId === user.id ||
      (currentMembership &&
        (currentMembership.role === "OWNER" || currentMembership.role === "ADMIN"))

    if (!canManage) {
      throw new ForbiddenError("Only owners and admins can update roles")
    }

    if (targetUserId === team.ownerId) {
      throw new BadRequestError("Cannot change the team owner's role")
    }

    // Get existing member info for logging
    const { data: existingMember } = await supabase
      .from("TeamMember")
      .select(`
        id, role,
        user:User(name, email)
      `)
      .eq("teamId", id)
      .eq("userId", targetUserId)
      .single()

    // Update member role
    const { data: updatedMember, error: updateError } = await supabase
      .from("TeamMember")
      .update({ role: data.role })
      .eq("teamId", id)
      .eq("userId", targetUserId)
      .select(`
        id, role, userId, createdAt,
        user:User(id, name, email, image)
      `)
      .single()

    if (updateError?.code === "PGRST116" || !updatedMember) {
      throw new NotFoundError("Team member")
    }
    if (updateError) throw updateError

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "member_role_changed",
      targetType: "member",
      targetId: targetUserId,
      metadata: {
        oldRole: existingMember?.role,
        newRole: data.role,
        userName: (existingMember?.user as any)?.name,
      },
    })

    return updatedMember
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id, userId: targetUserId } = params

    // Get team
    const { data: team, error: teamError } = await supabase
      .from("Team")
      .select("ownerId")
      .eq("id", id)
      .single()

    if (teamError?.code === "PGRST116" || !team) {
      throw new NotFoundError("Team")
    }
    if (teamError) throw teamError

    if (targetUserId === team.ownerId) {
      throw new BadRequestError("Cannot remove the team owner")
    }

    // Check current user's membership
    const { data: currentMembership } = await supabase
      .from("TeamMember")
      .select("role")
      .eq("teamId", id)
      .eq("userId", user.id)
      .single()

    const isSelf = targetUserId === user.id
    const canRemove =
      isSelf ||
      team.ownerId === user.id ||
      (currentMembership &&
        (currentMembership.role === "OWNER" || currentMembership.role === "ADMIN"))

    if (!canRemove) {
      throw new ForbiddenError("Access denied")
    }

    // Get member info for logging
    const { data: memberToRemove } = await supabase
      .from("TeamMember")
      .select(`
        id,
        user:User(name, email)
      `)
      .eq("teamId", id)
      .eq("userId", targetUserId)
      .single()

    // Delete member
    const { error: deleteError } = await supabase
      .from("TeamMember")
      .delete()
      .eq("teamId", id)
      .eq("userId", targetUserId)

    if (deleteError) throw deleteError

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "member_removed",
      targetType: "member",
      targetId: targetUserId,
      metadata: {
        userName: (memberToRemove?.user as any)?.name,
        email: (memberToRemove?.user as any)?.email,
        wasSelfRemoval: isSelf,
      },
    })

    return { success: true }
  },
})
