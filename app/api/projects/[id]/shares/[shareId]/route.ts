import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError, handleSupabaseError } from "@/lib/api"

type ShareRole = "VIEWER" | "COMMENTER" | "EDITOR" | "ADMIN"

async function canManageShares(projectId: string, userId: string, supabase: any) {
  const { data: project, error } = await supabase
    .from("Project")
    .select("userId, teamId")
    .eq("id", projectId)
    .single()

  if (error) handleSupabaseError(error, "Project")
  if (!project) {
    return { allowed: false, error: "Project not found", status: 404 }
  }

  if (project.userId === userId) {
    return { allowed: true, isOwner: true }
  }

  const { data: share } = await supabase
    .from("ProjectShare")
    .select("role")
    .eq("projectId", projectId)
    .eq("userId", userId)
    .single()

  if (share?.role === "ADMIN") {
    return { allowed: true, isOwner: false }
  }

  const teamId = project.teamId
  if (teamId) {
    const { data: membership } = await supabase
      .from("TeamMember")
      .select("role")
      .eq("teamId", teamId)
      .eq("userId", userId)
      .single()

    if (membership && (membership.role === "OWNER" || membership.role === "ADMIN")) {
      return { allowed: true, isOwner: false }
    }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

const updateShareSchema = z.object({
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR", "ADMIN"]),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateShareSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id, shareId } = params

    const access = await canManageShares(id, user.id, supabase)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Project")
      throw new ForbiddenError(access.error)
    }

    // Try to find as a share first
    const { data: share } = await supabase
      .from("ProjectShare")
      .select("id, userId, projectId")
      .eq("id", shareId)
      .single()

    if (share) {
      if (share.userId === user.id && !access.isOwner) {
        throw new BadRequestError("Cannot change your own permissions")
      }

      const { data: updatedShare, error: updateError } = await supabase
        .from("ProjectShare")
        .update({ role: data.role as ShareRole })
        .eq("id", shareId)
        .select(`
          id, role,
          user:User!userId(id, name, email, image)
        `)
        .single()

      if (updateError) handleSupabaseError(updateError, "Share")

      return updatedShare
    }

    // Try to find as an invite
    const { data: invite } = await supabase
      .from("ShareInvite")
      .select("id, projectId")
      .eq("id", shareId)
      .single()

    if (invite && invite.projectId === id) {
      const { data: updatedInvite, error: updateError } = await supabase
        .from("ShareInvite")
        .update({ role: data.role as ShareRole })
        .eq("id", shareId)
        .select("id, email, role, expiresAt")
        .single()

      if (updateError) handleSupabaseError(updateError, "Share")

      return { type: "invite", invite: updatedInvite }
    }

    throw new NotFoundError("Share")
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id, shareId } = params

    const access = await canManageShares(id, user.id, supabase)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Project")
      throw new ForbiddenError(access.error)
    }

    // Try to delete as a share first
    const { data: share } = await supabase
      .from("ProjectShare")
      .select("id, projectId")
      .eq("id", shareId)
      .single()

    if (share && share.projectId === id) {
      const { error: deleteError } = await supabase
        .from("ProjectShare")
        .delete()
        .eq("id", shareId)

      if (deleteError) handleSupabaseError(deleteError, "Share")
      return { success: true }
    }

    // Try to delete as an invite
    const { data: invite } = await supabase
      .from("ShareInvite")
      .select("id, projectId")
      .eq("id", shareId)
      .single()

    if (invite && invite.projectId === id) {
      const { error: deleteError } = await supabase
        .from("ShareInvite")
        .delete()
        .eq("id", shareId)

      if (deleteError) handleSupabaseError(deleteError, "Share")
      return { success: true }
    }

    throw new NotFoundError("Share")
  },
})
