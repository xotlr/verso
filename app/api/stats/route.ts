import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateStatsSchema = z.object({
  dailyGoal: z.number().min(100).max(10000).optional(),
})

// GET /api/stats - Get user's writing stats
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get or create user stats
    let stats = await prisma.userStats.findUnique({
      where: { userId: session.user.id },
    })

    if (!stats) {
      stats = await prisma.userStats.create({
        data: {
          userId: session.user.id,
          dailyGoal: 500,
          currentStreak: 0,
          longestStreak: 0,
        },
      })
    }

    // Get today's word count
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todaySessions = await prisma.writingSession.findMany({
      where: {
        userId: session.user.id,
        date: { gte: today },
      },
    })

    const todayWordCount = todaySessions.reduce((sum, s) => sum + s.wordCount, 0)
    const todayDuration = todaySessions.reduce((sum, s) => sum + s.duration, 0)

    // Check and update streak
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let currentStreak = stats.currentStreak

    // If last write was before yesterday, reset streak
    if (stats.lastWriteDate) {
      const lastWrite = new Date(stats.lastWriteDate)
      lastWrite.setHours(0, 0, 0, 0)

      if (lastWrite < yesterday) {
        currentStreak = 0
        await prisma.userStats.update({
          where: { userId: session.user.id },
          data: { currentStreak: 0 },
        })
      }
    }

    return NextResponse.json({
      ...stats,
      currentStreak,
      todayWordCount,
      todayDuration,
      goalProgress: Math.min((todayWordCount / stats.dailyGoal) * 100, 100),
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}

// PUT /api/stats - Update user's writing stats/goals
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const result = updateStatsSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { dailyGoal } = result.data

    const stats = await prisma.userStats.upsert({
      where: { userId: session.user.id },
      update: {
        ...(dailyGoal !== undefined && { dailyGoal }),
      },
      create: {
        userId: session.user.id,
        dailyGoal: dailyGoal || 500,
      },
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error updating stats:", error)
    return NextResponse.json(
      { error: "Failed to update stats" },
      { status: 500 }
    )
  }
}
