import { createApiHandler, NotFoundError, GoneError, RATE_LIMITS } from "@/lib/api"
import { logger } from "@/lib/logger"

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ params, supabase }) => {
    const { token } = params

    const { data: shareLink, error } = await supabase
      .from("ShareLink")
      .select(`
        id,
        token,
        isActive,
        expiresAt,
        permission,
        screenplayId,
        screenplay:Screenplay!screenplayId(
          id,
          title,
          content,
          synopsis,
          type,
          format,
          genre,
          logline,
          author,
          wordCount,
          views,
          createdAt,
          updatedAt,
          user:User!userId(name)
        )
      `)
      .eq("token", token)
      .single()

    if (error || !shareLink) {
      throw new NotFoundError("Share link")
    }

    if (!shareLink.isActive) {
      throw new GoneError("This share link has been revoked")
    }

    if (shareLink.expiresAt && new Date() > new Date(shareLink.expiresAt)) {
      throw new GoneError("This share link has expired")
    }

    const screenplay = shareLink.screenplay as {
      id: string
      title: string
      content: string
      synopsis: string | null
      type: string | null
      format: string | null
      genre: string | null
      logline: string | null
      author: string | null
      wordCount: number | null
      views: number
      createdAt: string
      updatedAt: string
      user: { name: string | null } | null
    }

    // Increment view count (fire and forget)
    supabase
      .from("Screenplay")
      .update({ views: (screenplay.views || 0) + 1 })
      .eq("id", shareLink.screenplayId)
      .then(({ error: updateError }: { error: Error | null }) => {
        if (updateError) {
          logger.error("Failed to increment view count", updateError)
        }
      })

    return {
      screenplay: {
        ...screenplay,
        author: screenplay.author || screenplay.user?.name || "Anonymous",
      },
      permission: shareLink.permission,
      expiresAt: shareLink.expiresAt,
    }
  },
})
