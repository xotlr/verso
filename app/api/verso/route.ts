import { createApiHandler, RateLimitError } from "@/lib/api"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, request }) => {
    const rateLimitResult = await rateLimit(
      `ai:${user.id}`,
      RATE_LIMITS.AI
    )

    if (!rateLimitResult.success) {
      throw new RateLimitError(
        "Too many AI requests. Please try again later.",
        Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      )
    }

    await request.json()

    return {
      suggestion: `Based on your screenplay, here are some suggestions:

1. Consider adding more visual descriptions to set the scene
2. Develop character dialogue to reveal personality
3. Use proper screenplay formatting (INT./EXT., character names in caps)
4. Add more conflict and tension to drive the story forward

Would you like me to help with any specific aspect of your screenplay?`
    }
  },
})
