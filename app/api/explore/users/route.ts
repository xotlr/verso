import { z } from "zod"
import { createApiHandler, RATE_LIMITS } from "@/lib/api"

const usersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
})

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ searchParams, supabase }) => {
    const queryResult = usersQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      search: searchParams.get("search") || undefined,
    })

    if (!queryResult.success) {
      return { error: "Invalid query parameters" }
    }

    const { limit, offset, search } = queryResult.data

    // Build query
    let query = supabase
      .from("User")
      .select(`
        id,
        name,
        username,
        image,
        banner,
        title,
        bio,
        location,
        projects:Project(id),
        screenplays:Screenplay(id)
      `, { count: "exact" })
      .eq("isPublic", true)
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%,title.ilike.%${search}%`)
    }

    const { data: users, count, error } = await query

    if (error) throw error

    // Transform to include _count
    interface UserResult {
      id: string
      name: string | null
      username: string | null
      image: string | null
      banner: string | null
      title: string | null
      bio: string | null
      location: string | null
      projects: Array<{ id: string }> | null
      screenplays: Array<{ id: string }> | null
    }
    const transformedUsers = ((users as UserResult[]) || []).map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      banner: user.banner,
      title: user.title,
      bio: user.bio,
      location: user.location,
      _count: {
        projects: (user.projects || []).length,
        screenplays: (user.screenplays || []).length,
      },
    }))

    const total = count || 0

    return { users: transformedUsers, total, hasMore: offset + transformedUsers.length < total }
  },
})
