import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    const userId = user.id

    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const [
      screenplayCount,
      projectCount,
      userStats,
      weekWritingSessions,
      todayWritingSessions,
      allTimeWritingSessions,
      lastEditedScreenplay,
      recentGreetingHistory,
    ] = await Promise.all([
      prisma.screenplay.count({
        where: {
          OR: [
            { userId },
            { team: { members: { some: { userId } } } },
          ],
        },
      }),
      prisma.project.count({
        where: {
          OR: [
            { userId },
            { team: { members: { some: { userId } } } },
          ],
        },
      }),
      prisma.userStats.findUnique({
        where: { userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          dailyGoal: true,
          lastWriteDate: true,
        },
      }),
      prisma.writingSession.findMany({
        where: { userId, date: { gte: weekAgo } },
        select: { wordCount: true },
      }),
      prisma.writingSession.findMany({
        where: { userId, date: { gte: today } },
        select: { wordCount: true },
      }),
      prisma.writingSession.aggregate({
        where: { userId },
        _sum: { wordCount: true },
      }),
      prisma.screenplay.findFirst({
        where: {
          OR: [
            { userId },
            { team: { members: { some: { userId } } } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        select: { genre: true },
      }),
      prisma.greetingHistory.findMany({
        where: { userId },
        orderBy: { shownAt: "desc" },
        take: 15,
        select: { text: true, category: true },
      }),
    ])

    const wordsThisWeek = weekWritingSessions.reduce((sum, s) => sum + s.wordCount, 0)
    const wordsToday = todayWritingSessions.reduce((sum, s) => sum + s.wordCount, 0)
    const totalWordsAllTime = allTimeWritingSessions._sum.wordCount || 0

    let currentStreak = userStats?.currentStreak || 0
    if (userStats?.lastWriteDate) {
      const lastWrite = new Date(userStats.lastWriteDate)
      lastWrite.setHours(0, 0, 0, 0)

      if (lastWrite.getTime() < yesterday.getTime()) {
        currentStreak = 0
      }
    }

    const recentGreetings = recentGreetingHistory.map((g) => g.text)
    const recentCategories = recentGreetingHistory
      .map((g) => g.category)
      .filter((c): c is string => c !== null)

    return {
      screenplayCount,
      projectCount,
      wordsThisWeek,
      wordsToday,
      totalWordsAllTime,
      lastEditedGenre: lastEditedScreenplay?.genre || null,
      currentStreak,
      longestStreak: userStats?.longestStreak || 0,
      dailyGoal: userStats?.dailyGoal || 500,
      lastWriteDate: userStats?.lastWriteDate || null,
      recentGreetings,
      recentCategories,
    }
  },
})
