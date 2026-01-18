import { NextResponse } from "next/server"
import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import type { GreetingCategory } from "@/lib/voice/features/greeting"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams }) => {
    const userId = user.id

    const screenplayLimit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const screenplayOffset = parseInt(searchParams.get("offset") || "0")

    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    })
    const teamIds = teamMemberships.map((m) => m.teamId)

    const userOrTeamWhere =
      teamIds.length > 0 ? { OR: [{ userId }, { teamId: { in: teamIds } }] } : { userId }

    const [
      screenplays,
      screenplayTotal,
      projects,
      series,
      stacks,
      counts,
      userStats,
      writingSessions,
      lastEditedScreenplay,
      recentGreetingHistory,
      recentActivity,
    ] = await Promise.all([
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
          stackId: true,
          isFavorite: true,
          isArchived: true,
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
      prisma.screenplay.count({ where: userOrTeamWhere }),
      prisma.project.findMany({
        where:
          teamIds.length > 0
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
          isArchived: true,
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
            take: 3,
            select: { id: true, title: true },
            orderBy: { updatedAt: "desc" },
          },
          _count: { select: { screenplays: true, notes: true, schedules: true, budgets: true } },
        },
      }),
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
          isArchived: true,
          projectId: true,
          project: { select: { id: true, name: true } },
          episodes: {
            take: 10,
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
            take: 5,
            select: { id: true, title: true, wordCount: true, updatedAt: true, type: true, genre: true },
            orderBy: { updatedAt: "desc" },
          },
          _count: { select: { screenplays: true } },
        },
      }),
      prisma.$transaction([
        prisma.screenplay.count({ where: userOrTeamWhere }),
        prisma.project.count({
          where:
            teamIds.length > 0
              ? { OR: [{ userId, teamId: null }, { teamId: { in: teamIds } }] }
              : { userId, teamId: null },
        }),
      ]),
      prisma.userStats.findUnique({
        where: { userId },
        select: { currentStreak: true, longestStreak: true, dailyGoal: true, lastWriteDate: true },
      }),
      prisma.writingSession.findMany({
        where: { userId, date: { gte: weekAgo } },
        select: { wordCount: true, date: true },
      }),
      prisma.screenplay.findFirst({
        where: userOrTeamWhere,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          genre: true,
          wordCount: true,
          updatedAt: true,
          series: { select: { title: true } },
          project: { select: { name: true } },
        },
      }),
      prisma.greetingHistory.findMany({
        where: { userId },
        orderBy: { shownAt: "desc" },
        take: 15,
        select: { text: true, category: true },
      }),
      prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          type: true,
          entityId: true,
          entityTitle: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ])

    const wordsThisWeek = writingSessions.reduce((sum, s) => sum + s.wordCount, 0)
    const wordsToday = writingSessions
      .filter((s) => new Date(s.date) >= today)
      .reduce((sum, s) => sum + s.wordCount, 0)

    const allTimeStats = await prisma.writingSession.aggregate({
      where: { userId },
      _sum: { wordCount: true },
    })
    const totalWordsAllTime = allTimeStats._sum.wordCount || 0

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
      // Activity-aware contextual greeting data
      recentActivity,
      lastEdited: lastEditedScreenplay
        ? {
            id: lastEditedScreenplay.id,
            title: lastEditedScreenplay.title,
            wordCount: lastEditedScreenplay.wordCount,
            updatedAt: lastEditedScreenplay.updatedAt,
            genre: lastEditedScreenplay.genre,
            seriesTitle: lastEditedScreenplay.series?.title || null,
            projectName: lastEditedScreenplay.project?.name || null,
          }
        : null,
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

    response.headers.set("Cache-Control", "private, max-age=30")
    return response
  },
})
