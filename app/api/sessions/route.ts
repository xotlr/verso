import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSessionSchema = z.object({
  wordCount: z.number().min(0),
  duration: z.number().min(0), // minutes
})

// POST /api/sessions - Record a writing session
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const result = createSessionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { wordCount, duration } = result.data

    // Create writing session
    const writingSession = await prisma.writingSession.create({
      data: {
        userId: session.user.id,
        wordCount,
        duration,
      },
    })

    // Update user stats - handle streak
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const stats = await prisma.userStats.findUnique({
      where: { userId: session.user.id },
    })

    if (stats) {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Normalize lastWrite to start of day for comparison
      const lastWriteDay = stats.lastWriteDate
        ? new Date(new Date(stats.lastWriteDate).setHours(0, 0, 0, 0)).getTime()
        : null

      const todayTime = today.getTime()
      const yesterdayTime = yesterday.getTime()

      let newStreak: number

      if (!lastWriteDay) {
        // First ever session
        newStreak = 1
      } else if (lastWriteDay === todayTime) {
        // Already wrote today - keep streak
        newStreak = stats.currentStreak
      } else if (lastWriteDay === yesterdayTime) {
        // Wrote yesterday, this is first session today - increment streak
        newStreak = stats.currentStreak + 1
      } else {
        // Missed days (lastWrite is before yesterday), reset to 1
        newStreak = 1
      }

      await prisma.userStats.update({
        where: { userId: session.user.id },
        data: {
          lastWriteDate: new Date(),
          currentStreak: newStreak,
          longestStreak: Math.max(stats.longestStreak, newStreak),
        },
      })
    } else {
      // Create stats if they don't exist
      await prisma.userStats.create({
        data: {
          userId: session.user.id,
          dailyGoal: 500,
          currentStreak: 1,
          longestStreak: 1,
          lastWriteDate: new Date(),
        },
      })
    }

    return NextResponse.json(writingSession)
  } catch (error) {
    console.error("Error creating session:", error)
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    )
  }
}

// GET /api/sessions - Get recent writing sessions
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get("days") || "7"), 30)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const sessions = await prisma.writingSession.findMany({
      where: {
        userId: session.user.id,
        date: { gte: startDate },
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error("Error fetching sessions:", error)
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    )
  }
}
