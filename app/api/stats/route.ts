import { z } from "zod"
import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const updateStatsSchema = z.object({
  dailyGoal: z.number().min(100).max(10000).optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    let stats = await prisma.userStats.findUnique({
      where: { userId: user.id },
    })

    if (!stats) {
      stats = await prisma.userStats.create({
        data: {
          userId: user.id,
          dailyGoal: 500,
          currentStreak: 0,
          longestStreak: 0,
        },
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todaySessions = await prisma.writingSession.findMany({
      where: {
        userId: user.id,
        date: { gte: today },
      },
    })

    const todayWordCount = todaySessions.reduce((sum, s) => sum + s.wordCount, 0)
    const todayDuration = todaySessions.reduce((sum, s) => sum + s.duration, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let currentStreak = stats.currentStreak

    if (stats.lastWriteDate) {
      const lastWrite = new Date(stats.lastWriteDate)
      lastWrite.setHours(0, 0, 0, 0)

      if (lastWrite.getTime() < yesterday.getTime()) {
        currentStreak = 0
      }
    }

    return {
      ...stats,
      currentStreak,
      todayWordCount,
      todayDuration,
      goalProgress: Math.min((todayWordCount / stats.dailyGoal) * 100, 100),
    }
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateStatsSchema,
  handler: async ({ user, data }) => {
    const { dailyGoal } = data

    const stats = await prisma.userStats.upsert({
      where: { userId: user.id },
      update: {
        ...(dailyGoal !== undefined && { dailyGoal }),
      },
      create: {
        userId: user.id,
        dailyGoal: dailyGoal || 500,
      },
    })

    return stats
  },
})
