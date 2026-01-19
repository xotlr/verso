import { z } from "zod"
import { createApiHandler, handleSupabaseError } from "@/lib/api"

const updateStatsSchema = z.object({
  dailyGoal: z.number().min(100).max(10000).optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    // Get or create user stats
    let { data: stats, error: fetchError } = await supabase
      .from("UserStats")
      .select("*")
      .eq("userId", user.id)
      .single()

    if (fetchError?.code === "PGRST116" || !stats) {
      // Create default stats
      const { data: newStats, error: createError } = await supabase
        .from("UserStats")
        .insert({
          userId: user.id,
          dailyGoal: 500,
          currentStreak: 0,
          longestStreak: 0,
        })
        .select()
        .single()

      if (createError) handleSupabaseError(createError, "Stats")
      stats = newStats
    } else if (fetchError) {
      handleSupabaseError(fetchError, "Stats")
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get today's writing sessions
    const { data: todaySessions, error: sessionsError } = await supabase
      .from("WritingSession")
      .select("wordCount, duration")
      .eq("userId", user.id)
      .gte("date", today.toISOString())

    if (sessionsError) handleSupabaseError(sessionsError, "Stats")

    type SessionData = { wordCount: number; duration: number }
    const todayWordCount = (todaySessions || []).reduce((sum: number, s: SessionData) => sum + s.wordCount, 0)
    const todayDuration = (todaySessions || []).reduce((sum: number, s: SessionData) => sum + s.duration, 0)

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
  handler: async ({ user, data, supabase }) => {
    const { dailyGoal } = data

    // Try to update existing stats
    const { data: existingStats } = await supabase
      .from("UserStats")
      .select("id")
      .eq("userId", user.id)
      .single()

    let stats
    if (existingStats) {
      const { data: updated, error } = await supabase
        .from("UserStats")
        .update({
          ...(dailyGoal !== undefined && { dailyGoal }),
        })
        .eq("userId", user.id)
        .select()
        .single()

      if (error) handleSupabaseError(error, "Stats")
      stats = updated
    } else {
      const { data: created, error } = await supabase
        .from("UserStats")
        .insert({
          userId: user.id,
          dailyGoal: dailyGoal || 500,
        })
        .select()
        .single()

      if (error) handleSupabaseError(error, "Stats")
      stats = created
    }

    return stats
  },
})
