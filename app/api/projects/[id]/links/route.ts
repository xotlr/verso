import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"

async function hasProjectAccess(projectId: string, userId: string, supabase: any): Promise<boolean> {
  const { data: project } = await supabase
    .from("Project")
    .select(`
      id, userId, teamId,
      team:Team(id, members:TeamMember(userId))
    `)
    .eq("id", projectId)
    .single()

  if (!project) return false
  if (project.userId === userId) return true
  if (project.team?.members?.some((m: { userId: string }) => m.userId === userId)) return true

  return false
}

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

    const hasAccess = await hasProjectAccess(projectId, user.id, supabase)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: links, error } = await supabase
      .from("ExternalLink")
      .select("*")
      .eq("projectId", projectId)
      .order("createdAt", { ascending: false })

    if (error) throw error

    return links
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createLinkSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id, supabase)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: link, error } = await supabase
      .from("ExternalLink")
      .insert({
        ...data,
        userId: user.id,
        projectId,
      })
      .select()
      .single()

    if (error) throw error

    return link
  },
})
