import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const updateShortcutsSchema = z.object({
  shortcuts: z.record(z.string(), z.unknown()),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { shortcuts: true },
    })

    if (!userData) {
      throw new NotFoundError("User")
    }

    return { shortcuts: userData.shortcuts || {} }
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateShortcutsSchema,
  handler: async ({ user, data }) => {
    const { shortcuts } = data

    if (typeof shortcuts !== "object" || shortcuts === null) {
      throw new BadRequestError("Invalid shortcuts format")
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { shortcuts: shortcuts as object },
    })

    return { success: true }
  },
})
