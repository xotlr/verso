import { createApiHandler, BadRequestError, RateLimitError } from "@/lib/api"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { initializeScreenplayContent } from "@/lib/screenplay"
import { createScreenplaySchema } from "@/lib/validation"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams, supabase }) => {
    const projectId = searchParams.get("projectId")
    const standalone = searchParams.get("standalone")
    const teamId = searchParams.get("teamId")
    const favorites = searchParams.get("favorites")
    const recent = searchParams.get("recent")
    const genre = searchParams.get("genre")
    const hasProject = searchParams.get("hasProject")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build query - RLS will automatically filter to accessible screenplays
    let query = supabase
      .from("Screenplay")
      .select(`
        id, title, wordCount, synopsis, logline, createdAt, updatedAt,
        projectId, teamId, stackId, isFavorite, isArchived, lastOpenedAt,
        genre, author, type, season, episode, episodeTitle, seriesId,
        series:Series(id, title),
        project:Project(id, name),
        team:Team(id, name),
        user:User(id, name)
      `, { count: "exact" })

    // Apply filters
    if (projectId) {
      query = query.eq("projectId", projectId)
    } else if (standalone === "true") {
      query = query.eq("userId", user.id).is("projectId", null)
    } else if (teamId) {
      query = query.eq("teamId", teamId)
    }

    if (favorites === "true") {
      query = query.eq("isFavorite", true)
    }
    if (recent === "true") {
      query = query.not("lastOpenedAt", "is", null)
    }
    if (genre) {
      query = query.eq("genre", genre)
    }
    if (hasProject === "true") {
      query = query.not("projectId", "is", null)
    } else if (hasProject === "false") {
      query = query.is("projectId", null)
    }

    // Order: favorites first, then by recent or updated
    if (recent === "true") {
      query = query.order("isFavorite", { ascending: false }).order("lastOpenedAt", { ascending: false })
    } else {
      query = query.order("isFavorite", { ascending: false }).order("updatedAt", { ascending: false })
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: screenplays, count, error } = await query

    if (error) {
      throw error
    }

    return {
      screenplays: screenplays || [],
      total: count || 0,
      hasMore: offset + (screenplays?.length || 0) < (count || 0),
    }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createScreenplaySchema,
  handler: async ({ user, data, supabase }) => {
    const rateLimitResult = await rateLimit(
      `screenplay-create:${user.id}`,
      RATE_LIMITS.PROJECT_CREATE
    )

    if (!rateLimitResult.success) {
      throw new RateLimitError(
        "Too many requests. Please try again later.",
        Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      )
    }

    // RLS will verify access to project/team if specified
    // If user doesn't have access, the insert will fail

    const authorName = data.author || user.name || "Written by..."
    let finalContent: string
    let wordCount: number

    try {
      const initialized = initializeScreenplayContent({
        content: data.content || "",
        title: data.title,
        author: authorName,
        logline: data.logline || undefined,
      })
      finalContent = initialized.content
      wordCount = initialized.wordCount
    } catch (error) {
      throw new BadRequestError(error instanceof Error ? error.message : "Content initialization failed")
    }

    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .insert({
        title: data.title,
        content: finalContent,
        wordCount,
        synopsis: data.logline || data.synopsis || null,
        logline: data.logline || null,
        author: data.author || authorName,
        userId: user.id,
        projectId: data.projectId || null,
        teamId: data.teamId || null,
        type: data.type || "FILM",
        season: data.season ?? null,
        episode: data.episode ?? null,
        episodeTitle: data.episodeTitle ?? null,
        genre: data.genre ?? null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log activity
    await supabase.from("Activity").insert({
      userId: user.id,
      type: "screenplay_created",
      entityId: screenplay.id,
      entityTitle: screenplay.title,
    })

    return screenplay
  },
})
