import { z } from "zod"
import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const createSessionSchema = z.object({
  wordCount: z.number().min(0),
  duration: z.number().min(0),
})

export const POST = createApiHandler({
  auth: "required",
  schema: createSessionSchema,
  handler: async ({ user, data }) => {
    const { wordCount, duration } = data

    const writingSession = await prisma.writingSession.create({
      data: {
        userId: user.id,
        wordCount,
        duration,
      },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const stats = await prisma.userStats.findUnique({
      where: { userId: user.id },
    })

    if (stats) {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const lastWriteDay = stats.lastWriteDate
        ? new Date(new Date(stats.lastWriteDate).setHours(0, 0, 0, 0)).getTime()
        : null

      const todayTime = today.getTime()
      const yesterdayTime = yesterday.getTime()

      let newStreak: number

      if (!lastWriteDay) {
        newStreak = 1
      } else if (lastWriteDay === todayTime) {
        newStreak = stats.currentStreak
      } else if (lastWriteDay === yesterdayTime) {
        newStreak = stats.currentStreak + 1
      } else {
        newStreak = 1
      }

      await prisma.userStats.update({
        where: { userId: user.id },
        data: {
          lastWriteDate: new Date(),
          currentStreak: newStreak,
          longestStreak: Math.max(stats.longestStreak, newStreak),
        },
      })
    } else {
      await prisma.userStats.create({
        data: {
          userId: user.id,
          dailyGoal: 500,
          currentStreak: 1,
          longestStreak: 1,
          lastWriteDate: new Date(),
        },
      })
    }

    return writingSession
  },
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams }) => {
    const days = Math.min(parseInt(searchParams.get("days") || "7"), 30)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const sessions = await prisma.writingSession.findMany({
      where: {
        userId: user.id,
        date: { gte: startDate },
      },
      orderBy: { date: "desc" },
    })

    return sessions
  },
})
