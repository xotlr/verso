import { z } from "zod"
import { createApiHandler, handleSupabaseError } from "@/lib/api"

const createSessionSchema = z.object({
  wordCount: z.number().min(0),
  duration: z.number().min(0),
})

export const POST = createApiHandler({
  auth: "required",
  schema: createSessionSchema,
  handler: async ({ user, data, supabase }) => {
    const { wordCount, duration } = data

    // Create writing session
    const { data: writingSession, error: sessionError } = await supabase
      .from("WritingSession")
      .insert({
        userId: user.id,
        wordCount,
        duration,
      })
      .select()
      .single()

    if (sessionError) handleSupabaseError(sessionError, "Session")

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get user stats
    const { data: stats } = await supabase
      .from("UserStats")
      .select("*")
      .eq("userId", user.id)
      .single()

    if (stats) {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const lastWriteDay = stats.lastWriteDate
        ? new Date(new Date(stats.lastWriteDate).setHours(0, 0, 0, 0)).getTime()
        : null

      const todayTime = today.getTime()
      const yesterdayTime = yesterday.getTime()

      let newStreak: number

      if (!lastWriteDay) {
        newStreak = 1
      } else if (lastWriteDay === todayTime) {
        newStreak = stats.currentStreak
      } else if (lastWriteDay === yesterdayTime) {
        newStreak = stats.currentStreak + 1
      } else {
        newStreak = 1
      }

      await supabase
        .from("UserStats")
        .update({
          lastWriteDate: new Date().toISOString(),
          currentStreak: newStreak,
          longestStreak: Math.max(stats.longestStreak, newStreak),
        })
        .eq("userId", user.id)
    } else {
      await supabase
        .from("UserStats")
        .insert({
          userId: user.id,
          dailyGoal: 500,
          currentStreak: 1,
          longestStreak: 1,
          lastWriteDate: new Date().toISOString(),
        })
    }

    return writingSession
  },
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams, supabase }) => {
    const days = Math.min(parseInt(searchParams.get("days") || "7"), 30)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const { data: sessions, error } = await supabase
      .from("WritingSession")
      .select("*")
      .eq("userId", user.id)
      .gte("date", startDate.toISOString())
      .order("date", { ascending: false })

    if (error) handleSupabaseError(error, "Session")

    return sessions || []
  },
})
