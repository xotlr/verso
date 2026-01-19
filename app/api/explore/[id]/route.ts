import { createApiHandler, NotFoundError, RATE_LIMITS } from "@/lib/api"
import { logger } from "@/lib/logger"

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ params, supabase }) => {
    const { id } = params

    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .select(`
        id,
        title,
        content,
        synopsis,
        genre,
        views,
        publishedAt,
        user:User!userId(id, name, image, bio)
      `)
      .eq("id", id)
      .eq("isPublic", true)
      .single()

    if (error || !screenplay) {
      throw new NotFoundError("Screenplay not found or not public")
    }

    // Increment view count in background
    supabase
      .from("Screenplay")
      .update({ views: (screenplay.views || 0) + 1 })
      .eq("id", id)
      .then(({ error: updateError }: { error: Error | null }) => {
        if (updateError) {
          logger.error("Failed to increment view count", updateError)
        }
      })

    return screenplay
  },
})
