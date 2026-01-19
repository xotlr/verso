import { z } from "zod"
import { createApiHandler, RATE_LIMITS } from "@/lib/api"

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ searchParams, supabase }) => {
    const queryResult = activityQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
    })

    if (!queryResult.success) {
      return { error: "Invalid query parameters" }
    }

    const { limit } = queryResult.data

    const { data: activities, error } = await supabase
      .from("Activity")
      .select(`
        id,
        type,
        entityId,
        entityTitle,
        createdAt,
        user:User!userId(id, name, image)
      `)
      .eq("type", "screenplay_published")
      .order("createdAt", { ascending: false })
      .limit(limit)

    if (error) throw error

    // Enrich with screenplay data
    const enrichedActivities = await Promise.all(
      (activities || []).map(async (activity: { type: string; entityId: string; user: { id: string; name: string | null; image: string | null } | null }) => {
        if (activity.type === "screenplay_published" && activity.entityId) {
          const { data: screenplay } = await supabase
            .from("Screenplay")
            .select("id, title, synopsis, genre, isPublic")
            .eq("id", activity.entityId)
            .single()

          if (screenplay?.isPublic) {
            return { ...activity, screenplay }
          }
          return null
        }
        return activity
      })
    )

    return { activities: enrichedActivities.filter(Boolean) }
  },
})
