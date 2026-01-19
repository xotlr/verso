import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"

type ShareRole = "VIEWER" | "COMMENTER" | "EDITOR" | "ADMIN"

async function canManageShares(seriesId: string, userId: string, supabase: any) {
  const { data: series, error } = await supabase
    .from("Series")
    .select("userId, project:Project(teamId)")
    .eq("id", seriesId)
    .single()

  if (error?.code === "PGRST116" || !series) {
    return { allowed: false, error: "Series not found", status: 404 }
  }
  if (error) throw error

  if (series.userId === userId) {
    return { allowed: true, isOwner: true }
  }

  const { data: share } = await supabase
    .from("SeriesShare")
    .select("role")
    .eq("seriesId", seriesId)
    .eq("userId", userId)
    .single()

  if (share?.role === "ADMIN") {
    return { allowed: true, isOwner: false }
  }

  const teamId = series.project?.teamId
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
      if (access.status === 404) throw new NotFoundError("Series")
      throw new ForbiddenError(access.error)
    }

    // Try to find as a share first
    const { data: share } = await supabase
      .from("SeriesShare")
      .select("id, userId, seriesId")
      .eq("id", shareId)
      .single()

    if (share) {
      if (share.userId === user.id && !access.isOwner) {
        throw new BadRequestError("Cannot change your own permissions")
      }

      const { data: updatedShare, error: updateError } = await supabase
        .from("SeriesShare")
        .update({ role: data.role as ShareRole })
        .eq("id", shareId)
        .select(`
          id, role,
          user:User!userId(id, name, email, image)
        `)
        .single()

      if (updateError) throw updateError

      return updatedShare
    }

    // Try to find as an invite
    const { data: invite } = await supabase
      .from("ShareInvite")
      .select("id, seriesId")
      .eq("id", shareId)
      .single()

    if (invite && invite.seriesId === id) {
      const { data: updatedInvite, error: updateError } = await supabase
        .from("ShareInvite")
        .update({ role: data.role as ShareRole })
        .eq("id", shareId)
        .select("id, email, role, expiresAt")
        .single()

      if (updateError) throw updateError

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
      if (access.status === 404) throw new NotFoundError("Series")
      throw new ForbiddenError(access.error)
    }

    // Try to delete as a share first
    const { data: share } = await supabase
      .from("SeriesShare")
      .select("id, seriesId")
      .eq("id", shareId)
      .single()

    if (share && share.seriesId === id) {
      const { error: deleteError } = await supabase
        .from("SeriesShare")
        .delete()
        .eq("id", shareId)

      if (deleteError) throw deleteError
      return { success: true }
    }

    // Try to delete as an invite
    const { data: invite } = await supabase
      .from("ShareInvite")
      .select("id, seriesId")
      .eq("id", shareId)
      .single()

    if (invite && invite.seriesId === id) {
      const { error: deleteError } = await supabase
        .from("ShareInvite")
        .delete()
        .eq("id", shareId)

      if (deleteError) throw deleteError
      return { success: true }
    }

    throw new NotFoundError("Share")
  },
})
