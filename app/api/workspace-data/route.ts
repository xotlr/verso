import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { GreetingCategory } from "@/lib/greeting/types"

/**
 * GET /api/workspace-data
 *
 * Combined endpoint that returns all workspace data in a single request:
 * - screenplays (with pagination)
 * - projects (with counts)
 * - series (with episode counts)
 * - stacks (with screenplay counts)
 * - dashboard stats
 *
 * This eliminates 5 separate HTTP requests and their duplicate auth checks,
 * reducing TTFB by ~60-70%.
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)

    // Pagination for screenplays
    const screenplayLimit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const screenplayOffset = parseInt(searchParams.get("offset") || "0")

    // Calculate dates for stats
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Pre-fetch user's team IDs - MUCH faster than nested traversal
    // This turns O(n) nested lookups into a single indexed query
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    })
    const teamIds = teamMemberships.map((m) => m.teamId)

    // Optimized where clause using pre-fetched team IDs
    // Instead of: { team: { members: { some: { userId } } } }
    // We use:     { teamId: { in: teamIds } }
    const userOrTeamWhere = teamIds.length > 0
      ? { OR: [{ userId }, { teamId: { in: teamIds } }] }
      : { userId }

    // Run ALL queries in parallel - single auth check for everything
    const [
      // Screenplays
      screenplays,
      screenplayTotal,
      // Projects
      projects,
      // Series (user's own only, limit episodes for preview)
      series,
      // Stacks (user's own only, limit screenplays for preview)
      stacks,
      // Dashboard stats - combined into fewer queries
      counts,
      userStats,
      writingSessions,
      lastEditedScreenplay,
      recentGreetingHistory,
    ] = await Promise.all([
      // Screenplays with all filters
      prisma.screenplay.findMany({
        where: userOrTeamWhere,
        orderBy: { updatedAt: "desc" },
        take: screenplayLimit,
        skip: screenplayOffset,
        select: {
          id: true,
          title: true,
          wordCount: true,
          synopsis: true,
          logline: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
          teamId: true,
          isFavorite: true,
          lastOpenedAt: true,
          genre: true,
          author: true,
          type: true,
          season: true,
          episode: true,
          episodeTitle: true,
          seriesId: true,
          series: { select: { id: true, title: true } },
          project: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      }),

      // Screenplay count for pagination
      prisma.screenplay.count({ where: userOrTeamWhere }),

      // Projects with counts - using optimized team ID lookup
      prisma.project.findMany({
        where: teamIds.length > 0
          ? { OR: [{ userId, teamId: null }, { teamId: { in: teamIds } }] }
          : { userId, teamId: null },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          coverImage: true,
          banner: true,
          logo: true,
          type: true,
          status: true,
          budget: true,
          createdAt: true,
          updatedAt: true,
          teamId: true,
          team: { select: { id: true, name: true } },
          roles: {
            select: {
              id: true,
              role: true,
              name: true,
              userId: true,
              user: { select: { id: true, name: true, image: true } },
            },
            orderBy: { role: "asc" },
          },
          screenplays: {
            take: 3, // Preview only
            select: { id: true, title: true },
            orderBy: { updatedAt: "desc" },
          },
          _count: {
            select: { screenplays: true, notes: true, schedules: true, budgets: true },
          },
        },
      }),

      // Series - limit episodes to 10 per series for preview
      prisma.series.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          logline: true,
          genre: true,
          format: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
          project: { select: { id: true, name: true } },
          episodes: {
            take: 10, // Limit for initial load - can fetch more on expand
            select: {
              id: true,
              title: true,
              season: true,
              episode: true,
              episodeTitle: true,
              wordCount: true,
              updatedAt: true,
            },
            orderBy: [{ season: "asc" }, { episode: "asc" }],
          },
          _count: { select: { episodes: true } },
        },
      }),

      // Stacks - limit screenplays to 5 per stack for preview
      prisma.stack.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
          project: { select: { id: true, name: true } },
          screenplays: {
            take: 5, // Limit for initial load
            select: {
              id: true,
              title: true,
              wordCount: true,
              updatedAt: true,
              type: true,
              genre: true,
            },
            orderBy: { updatedAt: "desc" },
          },
          _count: { select: { screenplays: true } },
        },
      }),

      // Combined counts query - single round trip instead of 2
      prisma.$transaction([
        prisma.screenplay.count({ where: userOrTeamWhere }),
        prisma.project.count({
          where: teamIds.length > 0
            ? { OR: [{ userId, teamId: null }, { teamId: { in: teamIds } }] }
            : { userId, teamId: null },
        }),
      ]),

      // User stats
      prisma.userStats.findUnique({
        where: { userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          dailyGoal: true,
          lastWriteDate: true,
        },
      }),

      // Writing sessions - fetch all needed in one query, aggregate in JS
      prisma.writingSession.findMany({
        where: { userId, date: { gte: weekAgo } },
        select: { wordCount: true, date: true },
      }),

      // Last edited screenplay genre
      prisma.screenplay.findFirst({
        where: userOrTeamWhere,
        orderBy: { updatedAt: "desc" },
        select: { genre: true },
      }),

      // Recent greetings
      prisma.greetingHistory.findMany({
        where: { userId },
        orderBy: { shownAt: "desc" },
        take: 15,
        select: { text: true, category: true },
      }),
    ])

    // Calculate writing stats from fetched sessions
    const wordsThisWeek = writingSessions.reduce((sum, s) => sum + s.wordCount, 0)
    const wordsToday = writingSessions
      .filter((s) => new Date(s.date) >= today)
      .reduce((sum, s) => sum + s.wordCount, 0)

    // Fetch total words all time separately (aggregate can't be in findMany)
    const allTimeStats = await prisma.writingSession.aggregate({
      where: { userId },
      _sum: { wordCount: true },
    })
    const totalWordsAllTime = allTimeStats._sum.wordCount || 0

    // Calculate streak
    let currentStreak = userStats?.currentStreak || 0
    if (userStats?.lastWriteDate) {
      const lastWrite = new Date(userStats.lastWriteDate)
      lastWrite.setHours(0, 0, 0, 0)
      if (lastWrite.getTime() < yesterday.getTime()) {
        currentStreak = 0
      }
    }

    const [screenplayCount, projectCount] = counts

    const dashboardStats = {
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
      recentGreetings: recentGreetingHistory.map((g) => g.text),
      recentCategories: recentGreetingHistory
        .map((g) => g.category)
        .filter((c): c is GreetingCategory => c !== null) as GreetingCategory[],
    }

    const response = NextResponse.json({
      screenplays: {
        items: screenplays,
        total: screenplayTotal,
        hasMore: screenplayOffset + screenplays.length < screenplayTotal,
      },
      projects,
      series,
      stacks,
      dashboardStats,
    })

    // Short cache for private data
    response.headers.set("Cache-Control", "private, max-age=30")
    return response
  } catch (error) {
    console.error("Error fetching workspace data:", error)
    return NextResponse.json(
      { error: "Failed to fetch workspace data" },
      { status: 500 }
    )
  }
}
