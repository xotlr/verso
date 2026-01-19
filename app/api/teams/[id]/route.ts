import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { logTeamAction } from "@/lib/audit-log"

const updateTeamSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  banner: z.string().url().nullable().optional(),
  logo: z.string().url().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  website: z.string().max(200).nullable().optional(),
  isPublic: z.boolean().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    // RLS ensures user is member or owner
    const { data: team, error } = await supabase
      .from("Team")
      .select(`
        *,
        owner:User!ownerId(id, name, email, image),
        members:TeamMember(
          id, role, userId, createdAt,
          user:User(id, name, email, image, title, createdAt)
        ),
        projects:Project(id, name, description, coverImage, createdAt),
        invites:TeamInvite(id, email, role, expiresAt)
      `)
      .eq("id", id)
      .single()

    if (error?.code === "PGRST116" || !team) {
      throw new NotFoundError("Team")
    }
    if (error) throw error

    // Verify membership (RLS should handle this, but double-check)
    const isMember = team.members?.some((m: any) => m.userId === user.id)
    if (!isMember && team.ownerId !== user.id) {
      throw new ForbiddenError("Access denied")
    }

    return {
      ...team,
      _count: {
        projects: team.projects?.length || 0,
        members: team.members?.length || 0,
        invites: team.invites?.length || 0,
      },
    }
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateTeamSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    // Check if user has admin access
    const { data: membership } = await supabase
      .from("TeamMember")
      .select("role")
      .eq("teamId", id)
      .eq("userId", user.id)
      .single()

    const { data: team } = await supabase
      .from("Team")
      .select("ownerId")
      .eq("id", id)
      .single()

    if (!team) {
      throw new NotFoundError("Team")
    }

    const canEdit =
      team.ownerId === user.id ||
      membership?.role === "OWNER" ||
      membership?.role === "ADMIN"

    if (!canEdit) {
      throw new ForbiddenError("Access denied")
    }

    // Update team
    const { data: updatedTeam, error: updateError } = await supabase
      .from("Team")
      .update(data)
      .eq("id", id)
      .select(`
        *,
        owner:User!ownerId(id, name, email, image),
        members:TeamMember(
          id, role, userId, createdAt,
          user:User(id, name, email, image)
        )
      `)
      .single()

    if (updateError) throw updateError

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "team_updated",
      targetType: "settings",
      metadata: { changes: data },
    })

    return {
      ...updatedTeam,
      _count: {
        projects: 0,
        members: updatedTeam.members?.length || 0,
        invites: 0,
      },
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const { data: team } = await supabase
      .from("Team")
      .select("ownerId, name")
      .eq("id", id)
      .single()

    if (!team) {
      throw new NotFoundError("Team")
    }

    if (team.ownerId !== user.id) {
      throw new ForbiddenError("Only the team owner can delete the team")
    }

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "team_deleted",
      metadata: { teamName: team.name },
    })

    const { error } = await supabase
      .from("Team")
      .delete()
      .eq("id", id)

    if (error) throw error

    return { success: true }
  },
})
