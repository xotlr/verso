import { NextResponse } from "next/server"
import { createApiHandler } from "@/lib/api"
import type { GreetingCategory } from "@/lib/voice/features/greeting"

interface ProjectData {
  id: string
  name: string
  description: string | null
  coverImage: string | null
  banner: string | null
  logo: string | null
  type: string | null
  status: string | null
  budget: number | null
  createdAt: string
  updatedAt: string
  teamId: string | null
  isArchived: boolean
  team: { id: string; name: string } | null
  roles: unknown[]
  screenplays: unknown[]
  notes: unknown[]
  schedules: unknown[]
  budgets: unknown[]
}

interface SeriesData {
  id: string
  title: string
  logline: string | null
  genre: string | null
  format: string | null
  createdAt: string
  updatedAt: string
  isArchived: boolean
  projectId: string | null
  project: { id: string; name: string } | null
  episodes: unknown[]
}

interface StackData {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  projectId: string | null
  project: { id: string; name: string } | null
  screenplays: unknown[]
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams, supabase }) => {
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

    // Get team memberships first
    const membershipResult = await supabase
      .from("TeamMember")
      .select("teamId")
      .eq("userId", userId)
    const teamMemberships = membershipResult.data as { teamId: string }[] | null

    const teamIds = (teamMemberships || []).map((m) => m.teamId)

    // Build parallel queries
    const [
      screenplaysResult,
      screenplayTotalResult,
      projectsResult,
      seriesResult,
      stacksResult,
      screenplayCountResult,
      projectCountResult,
      userStatsResult,
      writingSessionsResult,
      lastEditedScreenplayResult,
      recentGreetingHistoryResult,
      recentActivityResult,
    ] = await Promise.all([
      // Screenplays
      teamIds.length > 0
        ? supabase
            .from("Screenplay")
            .select(`
              id, title, wordCount, synopsis, logline, createdAt, updatedAt,
              projectId, teamId, stackId, isFavorite, isArchived, lastOpenedAt,
              genre, author, type, season, episode, episodeTitle, seriesId,
              series:Series!seriesId(id, title),
              project:Project!projectId(id, name),
              team:Team!teamId(id, name),
              user:User!userId(id, name)
            `)
            .or(`userId.eq.${userId},teamId.in.(${teamIds.join(",")})`)
            .order("updatedAt", { ascending: false })
            .range(screenplayOffset, screenplayOffset + screenplayLimit - 1)
        : supabase
            .from("Screenplay")
            .select(`
              id, title, wordCount, synopsis, logline, createdAt, updatedAt,
              projectId, teamId, stackId, isFavorite, isArchived, lastOpenedAt,
              genre, author, type, season, episode, episodeTitle, seriesId,
              series:Series!seriesId(id, title),
              project:Project!projectId(id, name),
              team:Team!teamId(id, name),
              user:User!userId(id, name)
            `)
            .eq("userId", userId)
            .order("updatedAt", { ascending: false })
            .range(screenplayOffset, screenplayOffset + screenplayLimit - 1),

      // Screenplay total count
      teamIds.length > 0
        ? supabase
            .from("Screenplay")
            .select("id", { count: "exact", head: true })
            .or(`userId.eq.${userId},teamId.in.(${teamIds.join(",")})`)
        : supabase
            .from("Screenplay")
            .select("id", { count: "exact", head: true })
            .eq("userId", userId),

      // Projects with related data
      teamIds.length > 0
        ? supabase
            .from("Project")
            .select(`
              id, name, description, coverImage, banner, logo, type, status,
              budget, createdAt, updatedAt, teamId, isArchived,
              team:Team!teamId(id, name),
              roles:ProjectRole(id, role, name, userId, user:User!userId(id, name, image)),
              screenplays:Screenplay(id, title),
              notes:Note(id),
              schedules:Schedule(id),
              budgets:Budget(id)
            `)
            .or(`userId.eq.${userId},teamId.in.(${teamIds.join(",")})`)
            .is("teamId", null)
            .order("updatedAt", { ascending: false })
        : supabase
            .from("Project")
            .select(`
              id, name, description, coverImage, banner, logo, type, status,
              budget, createdAt, updatedAt, teamId, isArchived,
              team:Team!teamId(id, name),
              roles:ProjectRole(id, role, name, userId, user:User!userId(id, name, image)),
              screenplays:Screenplay(id, title),
              notes:Note(id),
              schedules:Schedule(id),
              budgets:Budget(id)
            `)
            .eq("userId", userId)
            .is("teamId", null)
            .order("updatedAt", { ascending: false }),

      // Series
      supabase
        .from("Series")
        .select(`
          id, title, logline, genre, format, createdAt, updatedAt, isArchived, projectId,
          project:Project!projectId(id, name),
          episodes:Screenplay(id, title, season, episode, episodeTitle, wordCount, updatedAt)
        `)
        .eq("userId", userId)
        .order("updatedAt", { ascending: false }),

      // Stacks
      supabase
        .from("Stack")
        .select(`
          id, name, createdAt, updatedAt, projectId,
          project:Project!projectId(id, name),
          screenplays:Screenplay(id, title, wordCount, updatedAt, type, genre)
        `)
        .eq("userId", userId)
        .order("updatedAt", { ascending: false }),

      // Screenplay count for dashboard
      teamIds.length > 0
        ? supabase
            .from("Screenplay")
            .select("id", { count: "exact", head: true })
            .or(`userId.eq.${userId},teamId.in.(${teamIds.join(",")})`)
        : supabase
            .from("Screenplay")
            .select("id", { count: "exact", head: true })
            .eq("userId", userId),

      // Project count for dashboard
      teamIds.length > 0
        ? supabase
            .from("Project")
            .select("id", { count: "exact", head: true })
            .or(`userId.eq.${userId},teamId.in.(${teamIds.join(",")})`)
            .is("teamId", null)
        : supabase
            .from("Project")
            .select("id", { count: "exact", head: true })
            .eq("userId", userId)
            .is("teamId", null),

      // User stats
      supabase
        .from("UserStats")
        .select("currentStreak, longestStreak, dailyGoal, lastWriteDate")
        .eq("userId", userId)
        .single(),

      // Writing sessions from past week
      supabase
        .from("WritingSession")
        .select("wordCount, date")
        .eq("userId", userId)
        .gte("date", weekAgo.toISOString()),

      // Last edited screenplay
      teamIds.length > 0
        ? supabase
            .from("Screenplay")
            .select(`
              id, title, genre, wordCount, updatedAt,
              series:Series!seriesId(title),
              project:Project!projectId(name)
            `)
            .or(`userId.eq.${userId},teamId.in.(${teamIds.join(",")})`)
            .order("updatedAt", { ascending: false })
            .limit(1)
            .single()
        : supabase
            .from("Screenplay")
            .select(`
              id, title, genre, wordCount, updatedAt,
              series:Series!seriesId(title),
              project:Project!projectId(name)
            `)
            .eq("userId", userId)
            .order("updatedAt", { ascending: false })
            .limit(1)
            .single(),

      // Recent greeting history
      supabase
        .from("GreetingHistory")
        .select("text, category")
        .eq("userId", userId)
        .order("shownAt", { ascending: false })
        .limit(15),

      // Recent activity
      supabase
        .from("Activity")
        .select("type, entityId, entityTitle, metadata, createdAt")
        .eq("userId", userId)
        .order("createdAt", { ascending: false })
        .limit(5),
    ])

    const screenplays = screenplaysResult.data || []
    const screenplayTotal = screenplayTotalResult.count || 0
    const projectsData = (projectsResult.data || []) as ProjectData[]
    const projects = projectsData.map((project) => ({
      ...project,
      roles: (project.roles || []).slice(0, 10),
      _count: {
        screenplays: (project.screenplays || []).length,
        notes: (project.notes || []).length,
        schedules: (project.schedules || []).length,
        budgets: (project.budgets || []).length,
      },
      screenplays: (project.screenplays || []).slice(0, 3),
    }))
    const seriesData = (seriesResult.data || []) as SeriesData[]
    const series = seriesData.map((s) => ({
      ...s,
      episodes: (s.episodes || []).slice(0, 10),
      _count: { episodes: (s.episodes || []).length },
    }))
    const stacksData = (stacksResult.data || []) as StackData[]
    const stacks = stacksData.map((stack) => ({
      ...stack,
      screenplays: (stack.screenplays || []).slice(0, 5),
      _count: { screenplays: (stack.screenplays || []).length },
    }))
    const userStats = userStatsResult.data as { currentStreak: number; longestStreak: number; dailyGoal: number; lastWriteDate: string | null } | null
    const writingSessions = (writingSessionsResult.data || []) as { wordCount: number; date: string }[]
    const lastEditedScreenplay = lastEditedScreenplayResult.data as { id: string; title: string; genre: string | null; wordCount: number; updatedAt: string; series: { title?: string } | null; project: { name?: string } | null } | null
    const recentGreetingHistory = (recentGreetingHistoryResult.data || []) as { text: string; category: string | null }[]
    const recentActivity = (recentActivityResult.data || []) as { type: string; entityId: string | null; entityTitle: string | null; metadata: unknown; createdAt: string }[]

    const wordsThisWeek = writingSessions.reduce((sum, s) => sum + s.wordCount, 0)
    const wordsToday = writingSessions
      .filter((s) => new Date(s.date) >= today)
      .reduce((sum, s) => sum + s.wordCount, 0)

    // All-time word count aggregate
    const allTimeResult = await supabase
      .from("WritingSession")
      .select("wordCount")
      .eq("userId", userId)
    const allTimeData = (allTimeResult.data || []) as { wordCount: number }[]

    const totalWordsAllTime = allTimeData.reduce((sum, s) => sum + s.wordCount, 0)

    let currentStreak = userStats?.currentStreak || 0
    if (userStats?.lastWriteDate) {
      const lastWrite = new Date(userStats.lastWriteDate)
      lastWrite.setHours(0, 0, 0, 0)
      if (lastWrite.getTime() < yesterday.getTime()) {
        currentStreak = 0
      }
    }

    const screenplayCount = screenplayCountResult.count || 0
    const projectCount = projectCountResult.count || 0

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
            seriesTitle: (lastEditedScreenplay.series as { title?: string } | null)?.title || null,
            projectName: (lastEditedScreenplay.project as { name?: string } | null)?.name || null,
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
