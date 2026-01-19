import { z } from "zod"
import { createApiHandler } from "@/lib/api"
import { validateUsername, normalizeUsername, generateUsernameSuggestions } from "@/lib/username"

const checkUsernameSchema = z.object({
  username: z.string().min(1, "Username is required"),
})

export const POST = createApiHandler({
  auth: "required",
  schema: checkUsernameSchema,
  handler: async ({ user, data, supabase }) => {
    const { username } = data

    const validation = validateUsername(username)
    if (!validation.valid) {
      return { available: false, error: validation.error }
    }

    const normalized = normalizeUsername(username)

    // Check if username is taken by another user
    const { data: existing } = await supabase
      .from("User")
      .select("id")
      .eq("username", normalized)
      .neq("id", user.id)
      .single()

    if (existing) {
      // Get user's name for suggestions
      const { data: userData } = await supabase
        .from("User")
        .select("name")
        .eq("id", user.id)
        .single()

      const suggestions = userData?.name ? generateUsernameSuggestions(userData.name) : []

      const availableSuggestions: string[] = []
      for (const suggestion of suggestions) {
        const { data: taken } = await supabase
          .from("User")
          .select("id")
          .eq("username", suggestion)
          .single()

        if (!taken) {
          availableSuggestions.push(suggestion)
        }
        if (availableSuggestions.length >= 3) break
      }

      return {
        available: false,
        error: "This username is already taken",
        suggestions: availableSuggestions,
      }
    }

    return { available: true, normalized }
  },
})
