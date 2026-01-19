import { z } from "zod"
import { createApiHandler, NotFoundError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { hasProjectAccess, requirePermission } from "@/lib/project-access"

const createLinkSchema = z.object({
  url: z.string().url("Invalid URL"),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  favicon: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  siteName: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  embedType: z.string().optional().nullable(),
  embedId: z.string().optional().nullable(),
  embedUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  isPlayable: z.boolean().optional().default(false),
  notes: z.string().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(supabase, projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: links, error } = await supabase
      .from("ExternalLink")
      .select("*")
      .eq("projectId", projectId)
      .order("createdAt", { ascending: false })

    if (error) handleSupabaseError(error, "Link")

    return links
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createLinkSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    // Require editor permission to add links
    await requirePermission(supabase, projectId, user.id, "editor")

    const { data: link, error } = await supabase
      .from("ExternalLink")
      .insert({
        ...data,
        userId: user.id,
        projectId,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error, "Link")

    return link
  },
})
