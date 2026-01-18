import { z } from "zod"
import { createApiHandler, UnauthorizedError, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

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
  handler: async ({ user, params }) => {
    const { id } = params

    if (user.id !== id) {
      throw new UnauthorizedError()
    }

    const userData = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        banner: true,
        bio: true,
        title: true,
        isPublic: true,
        plan: true,
        location: true,
        website: true,
        useCases: true,
      },
    })

    if (!userData) {
      throw new NotFoundError("User")
    }

    return userData
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateSettingsProfileSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    if (user.id !== id) {
      throw new UnauthorizedError()
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        useCases: true,
      },
    })

    return updatedUser
  },
})
