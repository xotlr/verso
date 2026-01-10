import { z } from "zod"
import { createApiHandler, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { validateUsername, normalizeUsername, generateUsernameSuggestions } from "@/lib/username"

const checkUsernameSchema = z.object({
  username: z.string().min(1, "Username is required"),
})

export const POST = createApiHandler({
  auth: "required",
  schema: checkUsernameSchema,
  handler: async ({ user, data }) => {
    const { username } = data

    const validation = validateUsername(username)
    if (!validation.valid) {
      return { available: false, error: validation.error }
    }

    const normalized = normalizeUsername(username)

    const existing = await prisma.user.findFirst({
      where: {
        username: normalized,
        NOT: { id: user.id },
      },
      select: { id: true },
    })

    if (existing) {
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true },
      })

      const suggestions = userData?.name ? generateUsernameSuggestions(userData.name) : []

      const availableSuggestions: string[] = []
      for (const suggestion of suggestions) {
        const taken = await prisma.user.findUnique({
          where: { username: suggestion },
          select: { id: true },
        })
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
