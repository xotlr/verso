import { z } from "zod"
import { createApiHandler, RATE_LIMITS, handleSupabaseError } from "@/lib/api"
import { MAX_PAGINATION_OFFSET } from "@/lib/constants"

/**
 * Sanitize search input to prevent SQL injection in ILIKE patterns.
 * Escapes special PostgreSQL pattern characters: %, _, \
 */
function sanitizeSearchInput(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')     // Escape percent signs
    .replace(/_/g, '\\_')     // Escape underscores
}

const usersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(MAX_PAGINATION_OFFSET).default(0),
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
      const sanitizedSearch = sanitizeSearchInput(search)
      query = query.or(`name.ilike.%${sanitizedSearch}%,username.ilike.%${sanitizedSearch}%,title.ilike.%${sanitizedSearch}%`)
    }

    const { data: users, count, error } = await query

    if (error) handleSupabaseError(error, "User")

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
