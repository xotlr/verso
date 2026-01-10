import { z } from "zod"
import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

const logGreetingSchema = z.object({
  category: z.string().min(1, "Category is required"),
  text: z.string().min(1, "Greeting text is required"),
})

export const POST = createApiHandler({
  auth: "required",
  schema: logGreetingSchema,
  handler: async ({ user, data }) => {
    const { category, text } = data

    try {
      await prisma.greetingHistory.create({
        data: {
          userId: user.id,
          category,
          text,
        },
      })

      const oldGreetings = await prisma.greetingHistory.findMany({
        where: { userId: user.id },
        orderBy: { shownAt: "desc" },
        skip: 20,
        select: { id: true },
      })

      if (oldGreetings.length > 0) {
        await prisma.greetingHistory.deleteMany({
          where: { id: { in: oldGreetings.map((g) => g.id) } },
        })
      }
    } catch (error) {
      logger.error("Failed to log greeting", error instanceof Error ? error : undefined, {
        userId: user.id,
      })
    }

    return { success: true }
  },
})
