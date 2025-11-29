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

    // Calculate dates
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

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

    return NextResponse.json({
      screenplayCount,
      projectCount,
      wordsThisWeek,
      currentStreak: userStats?.currentStreak || 0,
      longestStreak: userStats?.longestStreak || 0,
      dailyGoal: userStats?.dailyGoal || 500,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}
