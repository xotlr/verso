import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError, handleSupabaseError } from "@/lib/api"

type ShareRole = "VIEWER" | "COMMENTER" | "EDITOR" | "ADMIN"

async function canManageShares(screenplayId: string, userId: string, supabase: any) {
  const { data: screenplay, error } = await supabase
    .from("Screenplay")
    .select("userId, teamId, project:Project(teamId)")
    .eq("id", screenplayId)
    .single()

  if (error) handleSupabaseError(error, "Screenplay")
  if (!screenplay) {
    return { allowed: false, error: "Screenplay not found", status: 404 }
  }

  if (screenplay.userId === userId) {
    return { allowed: true, isOwner: true }
  }

  const { data: share } = await supabase
    .from("ScreenplayShare")
    .select("role")
    .eq("screenplayId", screenplayId)
    .eq("userId", userId)
    .single()

  if (share?.role === "ADMIN") {
    return { allowed: true, isOwner: false }
  }

  const teamId = screenplay.teamId || screenplay.project?.teamId
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
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    // Try to find as a share first
    const { data: share } = await supabase
      .from("ScreenplayShare")
      .select("id, userId, screenplayId")
      .eq("id", shareId)
      .single()

    if (share) {
      if (share.userId === user.id && !access.isOwner) {
        throw new BadRequestError("Cannot change your own permissions")
      }

      const { data: updatedShare, error: updateError } = await supabase
        .from("ScreenplayShare")
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
      .select("id, screenplayId")
      .eq("id", shareId)
      .single()

    if (invite && invite.screenplayId === id) {
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
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    // Try to delete as a share first
    const { data: share } = await supabase
      .from("ScreenplayShare")
      .select("id, screenplayId")
      .eq("id", shareId)
      .single()

    if (share && share.screenplayId === id) {
      const { error: deleteError } = await supabase
        .from("ScreenplayShare")
        .delete()
        .eq("id", shareId)

      if (deleteError) handleSupabaseError(deleteError, "Share")
      return { success: true }
    }

    // Try to delete as an invite
    const { data: invite } = await supabase
      .from("ShareInvite")
      .select("id, screenplayId")
      .eq("id", shareId)
      .single()

    if (invite && invite.screenplayId === id) {
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
