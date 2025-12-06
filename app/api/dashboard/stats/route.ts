import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Calculate dates with proper timezone handling
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Rolling 7 days: start from beginning of day 7 days ago
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Get all stats in parallel
    const [
      screenplayCount,
      projectCount,
      userStats,
      weekWritingSessions,
    ] = await Promise.all([
      // Total screenplays
      prisma.screenplay.count({
        where: {
          OR: [
            { userId },
            { team: { members: { some: { userId } } } },
          ],
        },
      }),
      // Total projects
      prisma.project.count({
        where: {
          OR: [
            { userId },
            { team: { members: { some: { userId } } } },
          ],
        },
      }),
      // User stats (streak)
      prisma.userStats.findUnique({
        where: { userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          dailyGoal: true,
          lastWriteDate: true,
        },
      }),
      // Words this week
      prisma.writingSession.findMany({
        where: {
          userId,
          date: { gte: weekAgo },
        },
        select: {
          wordCount: true,
        },
      }),
    ])

    // Calculate words this week
    const wordsThisWeek = weekWritingSessions.reduce(
      (sum, s) => sum + s.wordCount,
      0
    )

    // Calculate actual current streak (check if it's stale)
    let currentStreak = userStats?.currentStreak || 0
    if (userStats?.lastWriteDate) {
      const lastWrite = new Date(userStats.lastWriteDate)
      lastWrite.setHours(0, 0, 0, 0)

      // If last write was before yesterday, streak is broken
      if (lastWrite.getTime() < yesterday.getTime()) {
        currentStreak = 0
      }
    }

    return NextResponse.json({
      screenplayCount,
      projectCount,
      wordsThisWeek,
      currentStreak,
      longestStreak: userStats?.longestStreak || 0,
      dailyGoal: userStats?.dailyGoal || 500,
      lastWriteDate: userStats?.lastWriteDate || null,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}
