import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError, ConflictError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { logger } from "@/lib/logger"

export const GET = createApiHandler({
  auth: "required",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ params, supabase }) => {
    const { id } = params

    // RLS automatically filters - if no access, returns null
    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .select(`
        *,
        project:Project(id, name),
        team:Team(id, name),
        series:Series(id, title),
        seasonRef:Season(id, number, title)
      `)
      .eq("id", id)
      .single()

    if (error) handleSupabaseError(error, "Screenplay")
    if (!screenplay) throw new NotFoundError("Screenplay")

    // Update lastOpenedAt (RLS allows if user can view)
    await supabase
      .from("Screenplay")
      .update({ lastOpenedAt: new Date().toISOString() })
      .eq("id", id)

    return screenplay
  },
})

const updateScreenplaySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  synopsis: z.string().optional().nullable(),
  logline: z.string().optional().nullable(),
  genre: z.string().optional().nullable(),
  author: z.string().optional().nullable(),
  type: z.enum(["FILM", "TV"]).optional(),
  season: z.number().int().positive().nullable().optional(),
  episode: z.number().int().positive().nullable().optional(),
  episodeTitle: z.string().max(255).nullable().optional(),
  contactName: z.string().max(255).nullable().optional(),
  contactEmail: z.string().email().max(255).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  contactAddress: z.string().max(500).nullable().optional(),
  copyrightYear: z.number().int().min(1900).max(2100).nullable().optional(),
  copyrightHolder: z.string().max(255).nullable().optional(),
  registrationNumber: z.string().max(100).nullable().optional(),
  draftLabel: z.string().max(100).nullable().optional(),
  draftDate: z.string().nullable().optional(),
  showTitlePageContact: z.boolean().optional(),
  showTitlePageCopyright: z.boolean().optional(),
  showTitlePageDraft: z.boolean().optional(),
  expectedUpdatedAt: z.number().optional(),
})

async function handleUpdate(
  params: Record<string, string>,
  data: z.infer<typeof updateScreenplaySchema>,
  supabase: any
) {
  const { id } = params

  if (data.content !== undefined) {
    const contentSize = new TextEncoder().encode(data.content).length
    const MAX_CONTENT_SIZE = 5 * 1024 * 1024
    if (contentSize > MAX_CONTENT_SIZE) {
      throw new BadRequestError("Content too large. Maximum size is 5MB.")
    }
  }

  // Check for conflicts if expectedUpdatedAt provided
  if (data.expectedUpdatedAt !== undefined) {
    const { data: current } = await supabase
      .from("Screenplay")
      .select("updatedAt")
      .eq("id", id)
      .single()

    if (current && new Date(current.updatedAt).getTime() !== data.expectedUpdatedAt) {
      throw new ConflictError("Screenplay was modified by another user")
    }
  }

  const wordCount = data.content !== undefined
    ? data.content.split(/\s+/).filter(Boolean).length
    : undefined

  // Build update object
  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.content !== undefined) updateData.content = data.content
  if (wordCount !== undefined) updateData.wordCount = wordCount
  if (data.synopsis !== undefined) updateData.synopsis = data.synopsis
  if (data.logline !== undefined) updateData.logline = data.logline
  if (data.genre !== undefined) updateData.genre = data.genre
  if (data.author !== undefined) updateData.author = data.author
  if (data.type !== undefined) updateData.type = data.type
  if (data.season !== undefined) updateData.season = data.season
  if (data.episode !== undefined) updateData.episode = data.episode
  if (data.episodeTitle !== undefined) updateData.episodeTitle = data.episodeTitle
  if (data.contactName !== undefined) updateData.contactName = data.contactName
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone
  if (data.contactAddress !== undefined) updateData.contactAddress = data.contactAddress
  if (data.copyrightYear !== undefined) updateData.copyrightYear = data.copyrightYear
  if (data.copyrightHolder !== undefined) updateData.copyrightHolder = data.copyrightHolder
  if (data.registrationNumber !== undefined) updateData.registrationNumber = data.registrationNumber
  if (data.draftLabel !== undefined) updateData.draftLabel = data.draftLabel
  if (data.draftDate !== undefined) updateData.draftDate = data.draftDate ? new Date(data.draftDate).toISOString() : null
  if (data.showTitlePageContact !== undefined) updateData.showTitlePageContact = data.showTitlePageContact
  if (data.showTitlePageCopyright !== undefined) updateData.showTitlePageCopyright = data.showTitlePageCopyright
  if (data.showTitlePageDraft !== undefined) updateData.showTitlePageDraft = data.showTitlePageDraft

  // RLS policy (screenplay_update) requires EDITOR role
  const { data: screenplay, error } = await supabase
    .from("Screenplay")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    // handleSupabaseError already handles PGRST116 (not found) and RLS policy errors
    handleSupabaseError(error, "Screenplay")
  }
  if (!screenplay) throw new NotFoundError("Screenplay")

  return screenplay
}

export const PUT = createApiHandler({
  auth: "required",
  schema: updateScreenplaySchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ params, data, supabase }) => handleUpdate(params, data, supabase),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateScreenplaySchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ params, data, supabase }) => handleUpdate(params, data, supabase),
})

export const DELETE = createApiHandler({
  auth: "required",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    // First check if user is owner (RLS delete policy requires ownership)
    const { data: screenplay } = await supabase
      .from("Screenplay")
      .select("userId")
      .eq("id", id)
      .single()

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    if (screenplay.userId !== user.id) {
      throw new ForbiddenError("Only the owner can delete this screenplay")
    }

    const { error } = await supabase
      .from("Screenplay")
      .delete()
      .eq("id", id)

    if (error) handleSupabaseError(error, "Screenplay")

    logger.audit("delete", "screenplay", id, { userId: user.id })

    return { success: true }
  },
})
