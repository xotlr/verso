import { createApiHandler } from "@/lib/api"

type WritingSession = { wordCount: number }
type GreetingHistoryItem = { text: string; category: string | null }

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    const userId = user.id

    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Get user's team memberships
    const { data: memberships } = await supabase
      .from("TeamMember")
      .select("teamId")
      .eq("userId", userId)

    const teamIds = (memberships || []).map((m: { teamId: string }) => m.teamId)

    // Run parallel queries
    const [
      screenplayCountResult,
      projectCountResult,
      userStatsResult,
      weekWritingSessionsResult,
      todayWritingSessionsResult,
      allTimeWritingSessionsResult,
      lastEditedScreenplayResult,
      recentGreetingHistoryResult,
      recentActivityResult,
    ] = await Promise.all([
      // Screenplay count
      teamIds.length > 0
        ? supabase
            .from("Screenplay")
            .select("*", { count: "exact", head: true })
            .or(`userId.eq.${userId},teamId.in.(${teamIds.join(",")})`)
        : supabase
            .from("Screenplay")
            .select("*", { count: "exact", head: true })
            .eq("userId", userId),
      // Project count
      teamIds.length > 0
        ? supabase
            .from("Project")
            .select("*", { count: "exact", head: true })
            .or(`userId.eq.${userId},teamId.in.(${teamIds.join(",")})`)
        : supabase
            .from("Project")
            .select("*", { count: "exact", head: true })
            .eq("userId", userId),
      // User stats
      supabase
        .from("UserStats")
        .select("currentStreak, longestStreak, dailyGoal, lastWriteDate")
        .eq("userId", userId)
        .single(),
      // Week writing sessions
      supabase
        .from("WritingSession")
        .select("wordCount")
        .eq("userId", userId)
        .gte("date", weekAgo.toISOString()),
      // Today writing sessions
      supabase
        .from("WritingSession")
        .select("wordCount")
        .eq("userId", userId)
        .gte("date", today.toISOString()),
      // All time writing sessions sum
      supabase.rpc("sum_word_count", { user_id: userId }).single(),
      // Last edited screenplay
      teamIds.length > 0
        ? supabase
            .from("Screenplay")
            .select(`
              id, title, genre, wordCount, updatedAt,
              series:Series(title),
              project:Project(name)
            `)
            .or(`userId.eq.${userId},teamId.in.(${teamIds.join(",")})`)
            .order("updatedAt", { ascending: false })
            .limit(1)
            .single()
        : supabase
            .from("Screenplay")
            .select(`
              id, title, genre, wordCount, updatedAt,
              series:Series(title),
              project:Project(name)
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

    const screenplayCount = screenplayCountResult.count || 0
    const projectCount = projectCountResult.count || 0
    const userStats = userStatsResult.data
    const weekWritingSessions = weekWritingSessionsResult.data || []
    const todayWritingSessions = todayWritingSessionsResult.data || []
    // Fall back to manual calculation if RPC not available
    let totalWordsAllTime = 0
    if (allTimeWritingSessionsResult.data?.sum) {
      totalWordsAllTime = allTimeWritingSessionsResult.data.sum
    } else {
      // Fallback: get all sessions and sum manually
      const { data: allSessions } = await supabase
        .from("WritingSession")
        .select("wordCount")
        .eq("userId", userId)
      totalWordsAllTime = (allSessions || []).reduce((sum: number, s: WritingSession) => sum + s.wordCount, 0)
    }
    const lastEditedScreenplay = lastEditedScreenplayResult.data
    const recentGreetingHistory = recentGreetingHistoryResult.data || []
    const recentActivity = recentActivityResult.data || []

    const wordsThisWeek = weekWritingSessions.reduce((sum: number, s: WritingSession) => sum + s.wordCount, 0)
    const wordsToday = todayWritingSessions.reduce((sum: number, s: WritingSession) => sum + s.wordCount, 0)

    let currentStreak = userStats?.currentStreak || 0
    if (userStats?.lastWriteDate) {
      const lastWrite = new Date(userStats.lastWriteDate)
      lastWrite.setHours(0, 0, 0, 0)

      if (lastWrite.getTime() < yesterday.getTime()) {
        currentStreak = 0
      }
    }

    const recentGreetings = recentGreetingHistory.map((g: GreetingHistoryItem) => g.text)
    const recentCategories = recentGreetingHistory
      .map((g: GreetingHistoryItem) => g.category)
      .filter((c: string | null): c is string => c !== null)

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
      // Contextual greeting data
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
  },
})
