import { z } from "zod"
import { createApiHandler, NotFoundError, handleSupabaseError } from "@/lib/api"

async function hasLinkAccess(linkId: string, userId: string, supabase: any): Promise<boolean> {
  // Get link with project and team membership info
  const { data: link, error } = await supabase
    .from("ExternalLink")
    .select(`
      id, userId,
      project:Project(
        id, userId, teamId,
        team:Team(
          id,
          members:TeamMember(userId)
        )
      )
    `)
    .eq("id", linkId)
    .single()

  if (error || !link) return false

  // Owner has access
  if (link.userId === userId) return true

  // Project owner has access
  if (link.project?.userId === userId) return true

  // Check team membership
  if (link.project?.team) {
    const isMember = link.project.team.members?.some(
      (m: { userId: string }) => m.userId === userId
    )
    if (isMember) return true
  }

  return false
}

const updateLinkSchema = z.object({
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const hasAccess = await hasLinkAccess(id, user.id, supabase)
    if (!hasAccess) {
      throw new NotFoundError("Link")
    }

    const { data: link, error } = await supabase
      .from("ExternalLink")
      .select("*")
      .eq("id", id)
      .single()

    if (error) handleSupabaseError(error, "Link")

    return link
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateLinkSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const hasAccess = await hasLinkAccess(id, user.id, supabase)
    if (!hasAccess) {
      throw new NotFoundError("Link")
    }

    const { data: link, error } = await supabase
      .from("ExternalLink")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (error) handleSupabaseError(error, "Link")

    return link
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const hasAccess = await hasLinkAccess(id, user.id, supabase)
    if (!hasAccess) {
      throw new NotFoundError("Link")
    }

    const { error } = await supabase
      .from("ExternalLink")
      .delete()
      .eq("id", id)

    if (error) handleSupabaseError(error, "Link")

    return { success: true }
  },
})
