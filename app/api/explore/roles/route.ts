import { z } from "zod"
import { createApiHandler, RATE_LIMITS } from "@/lib/api"
import { getSession } from "@/lib/supabase-auth"

const rolesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
  role: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  isPaid: z.enum(["true", "false"]).optional(),
})

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ searchParams, supabase }) => {
    const queryResult = rolesQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      search: searchParams.get("search") || undefined,
      role: searchParams.get("role") || undefined,
      location: searchParams.get("location") || undefined,
      isPaid: searchParams.get("isPaid") || undefined,
    })

    if (!queryResult.success) {
      return { error: "Invalid query parameters" }
    }

    const { limit, offset, search, role, location, isPaid } = queryResult.data

    const session = await getSession()
    const userId = session?.user?.id

    // Build query
    let query = supabase
      .from("ProjectRoleNeed")
      .select(`
        id,
        role,
        description,
        location,
        isPaid,
        createdAt,
        project:Project!projectId(
          id,
          name,
          banner,
          logo,
          isPublic,
          user:User!userId(id, name, image)
        ),
        applications:ProjectRoleApplication(id, status, userId)
      `, { count: "exact" })
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1)

    if (role && role !== "all") {
      query = query.eq("role", role)
    }

    if (location) {
      query = query.ilike("location", `%${location}%`)
    }

    if (isPaid !== undefined) {
      query = query.eq("isPaid", isPaid === "true")
    }

    if (search) {
      query = query.or(`description.ilike.%${search}%`)
    }

    const { data: roleNeeds, count, error } = await query

    if (error) throw error

    // Filter for public projects and transform
    interface RoleNeedResult {
      id: string
      role: string
      description: string | null
      location: string | null
      isPaid: boolean
      createdAt: string
      project: {
        id: string
        name: string
        banner: string | null
        logo: string | null
        isPublic: boolean
        user: { id: string; name: string | null; image: string | null } | null
      } | null
      applications: Array<{ id: string; status: string; userId: string }> | null
    }
    const typedRoleNeeds = roleNeeds as RoleNeedResult[] || []
    const transformedRoleNeeds = typedRoleNeeds
      .filter((rn) => rn.project?.isPublic)
      .map((roleNeed) => {
        const applications = roleNeed.applications || []
        const userApplication = userId
          ? applications.find((a: { userId: string }) => a.userId === userId)
          : null

        return {
          id: roleNeed.id,
          role: roleNeed.role,
          description: roleNeed.description,
          location: roleNeed.location,
          isPaid: roleNeed.isPaid,
          createdAt: roleNeed.createdAt,
          project: {
            id: roleNeed.project!.id,
            name: roleNeed.project!.name,
            banner: roleNeed.project!.banner,
            logo: roleNeed.project!.logo,
            user: roleNeed.project!.user,
          },
          _count: { applications: applications.length },
          hasApplied: !!userApplication,
          applicationStatus: userApplication?.status || null,
        }
      })

    const total = count || 0

    return { roleNeeds: transformedRoleNeeds, total, hasMore: offset + transformedRoleNeeds.length < total }
  },
})
