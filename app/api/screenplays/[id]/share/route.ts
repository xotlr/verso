import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"

type SharePermission = "VIEW" | "COMMENT" | "EDIT"

async function checkScreenplayOwnership(screenplayId: string, userId: string, supabase: any) {
  const { data: screenplay, error } = await supabase
    .from("Screenplay")
    .select(`
      id, userId, teamId,
      project:Project(teamId),
      team:Team(id),
      shareLink:ShareLink(*)
    `)
    .eq("id", screenplayId)
    .single()

  if (error) handleSupabaseError(error, "Screenplay")
  if (!screenplay) {
    return { allowed: false, error: "Screenplay not found", status: 404, screenplay: null }
  }

  if (screenplay.userId === userId) {
    return { allowed: true, screenplay }
  }

  const teamId = screenplay.teamId || screenplay.project?.teamId
  if (teamId) {
    const { data: membership } = await supabase
      .from("TeamMember")
      .select("role")
      .eq("teamId", teamId)
      .eq("userId", userId)
      .single()

    if (membership) {
      return { allowed: true, screenplay }
    }
  }

  return { allowed: false, error: "Access denied", status: 403, screenplay: null }
}

function buildShareUrl(token: string, baseUrl: string) {
  return `${baseUrl}/shared/${token}`
}

const createShareSchema = z.object({
  permission: z.enum(["VIEW", "COMMENT", "EDIT"]).default("VIEW"),
  expiresAt: z.string().datetime().optional().nullable(),
})

const updateShareSchema = z.object({
  permission: z.enum(["VIEW", "COMMENT", "EDIT"]).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, request, supabase }) => {
    const { id } = params

    const access = await checkScreenplayOwnership(id, user.id, supabase)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    const shareLink = access.screenplay?.shareLink
    if (!shareLink) {
      return { shareLink: null }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
    const shareUrl = buildShareUrl(shareLink.token, baseUrl)

    return {
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        permission: shareLink.permission,
        isActive: shareLink.isActive,
        expiresAt: shareLink.expiresAt,
        url: shareUrl,
        createdAt: shareLink.createdAt,
        updatedAt: shareLink.updatedAt,
      },
    }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createShareSchema,
  handler: async ({ user, params, data, request, supabase }) => {
    const { id } = params

    const access = await checkScreenplayOwnership(id, user.id, supabase)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    // Check if share link already exists
    const { data: existingLink } = await supabase
      .from("ShareLink")
      .select("id")
      .eq("screenplayId", id)
      .single()

    let shareLink
    if (existingLink) {
      // Update existing
      const { data: updated, error: updateError } = await supabase
        .from("ShareLink")
        .update({
          permission: data.permission as SharePermission,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
          isActive: true,
        })
        .eq("screenplayId", id)
        .select()
        .single()

      if (updateError) handleSupabaseError(updateError, "Share")
      shareLink = updated
    } else {
      // Create new
      const { data: created, error: createError } = await supabase
        .from("ShareLink")
        .insert({
          screenplayId: id,
          permission: data.permission as SharePermission,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
          isActive: true,
        })
        .select()
        .single()

      if (createError) handleSupabaseError(createError, "Share")
      shareLink = created
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
    const shareUrl = buildShareUrl(shareLink.token, baseUrl)

    return {
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        permission: shareLink.permission,
        isActive: shareLink.isActive,
        expiresAt: shareLink.expiresAt,
        url: shareUrl,
        createdAt: shareLink.createdAt,
        updatedAt: shareLink.updatedAt,
      },
    }
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateShareSchema,
  handler: async ({ user, params, data, request, supabase }) => {
    const { id } = params

    const access = await checkScreenplayOwnership(id, user.id, supabase)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    if (!access.screenplay?.shareLink) {
      throw new NotFoundError("Share link")
    }

    const updateData: Record<string, any> = {}
    if (data.permission !== undefined) {
      updateData.permission = data.permission as SharePermission
    }
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt).toISOString() : null
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
    }

    const { data: shareLink, error: updateError } = await supabase
      .from("ShareLink")
      .update(updateData)
      .eq("screenplayId", id)
      .select()
      .single()

    if (updateError) handleSupabaseError(updateError, "Share")

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
    const shareUrl = buildShareUrl(shareLink.token, baseUrl)

    return {
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        permission: shareLink.permission,
        isActive: shareLink.isActive,
        expiresAt: shareLink.expiresAt,
        url: shareUrl,
        createdAt: shareLink.createdAt,
        updatedAt: shareLink.updatedAt,
      },
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkScreenplayOwnership(id, user.id, supabase)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    if (!access.screenplay?.shareLink) {
      throw new NotFoundError("Share link")
    }

    const { error: deleteError } = await supabase
      .from("ShareLink")
      .delete()
      .eq("screenplayId", id)

    if (deleteError) handleSupabaseError(deleteError, "Share")

    return { success: true }
  },
})
