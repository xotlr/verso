import { z } from "zod"
import { createApiHandler, UnauthorizedError, NotFoundError } from "@/lib/api"

// Valid use case IDs from onboarding
const validUseCases = [
  "feature",
  "tv",
  "short",
  "stage",
  "music-video",
  "commercial",
  "podcast",
  "student",
  "exploring",
] as const

const updateSettingsProfileSchema = z.object({
  name: z.string().max(100).optional(),
  useCases: z
    .array(z.enum(validUseCases))
    .max(validUseCases.length)
    .optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    if (user.id !== id) {
      throw new UnauthorizedError()
    }

    const { data: userData, error } = await supabase
      .from("User")
      .select(`
        id, name, username, email, image, banner,
        bio, title, isPublic, plan, location, website, useCases
      `)
      .eq("id", id)
      .single()

    if (error?.code === "PGRST116" || !userData) {
      throw new NotFoundError("User")
    }
    if (error) throw error

    return userData
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateSettingsProfileSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    if (user.id !== id) {
      throw new UnauthorizedError()
    }

    const { data: updatedUser, error } = await supabase
      .from("User")
      .update(data)
      .eq("id", id)
      .select("id, name, useCases")
      .single()

    if (error) throw error

    return updatedUser
  },
})
