import { z } from "zod"
import { createApiHandler, RATE_LIMITS, handleSupabaseError } from "@/lib/api"

const projectsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
})

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ searchParams, supabase }) => {
    const queryResult = projectsQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      search: searchParams.get("search") || undefined,
    })

    if (!queryResult.success) {
      return { error: "Invalid query parameters" }
    }

    const { limit, offset, search } = queryResult.data

    let query = supabase
      .from("Project")
      .select(`
        id,
        name,
        description,
        banner,
        logo,
        status,
        publishedAt,
        user:User!userId(id, name, image),
        roles:ProjectRole(
          id,
          role,
          name,
          user:User!userId(id, image)
        ),
        screenplays:Screenplay(id)
      `, { count: "exact" })
      .eq("isPublic", true)
      .order("publishedAt", { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: projects, count, error } = await query

    if (error) handleSupabaseError(error, "Project")

    // Transform to include _count and limit roles
    interface ProjectResult {
      id: string
      name: string
      description: string | null
      banner: string | null
      logo: string | null
      status: string
      publishedAt: string | null
      user: { id: string; name: string | null; image: string | null } | null
      roles: Array<{ id: string; role: string; name: string | null; user: { id: string; image: string | null } | null }> | null
      screenplays: Array<{ id: string }> | null
    }
    const transformedProjects = (projects as ProjectResult[] || []).map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      banner: project.banner,
      logo: project.logo,
      status: project.status,
      publishedAt: project.publishedAt,
      user: project.user,
      roles: (project.roles || []).slice(0, 10),
      _count: { screenplays: (project.screenplays || []).length },
    }))

    const total = count || 0

    return { projects: transformedProjects, total, hasMore: offset + transformedProjects.length < total }
  },
})
