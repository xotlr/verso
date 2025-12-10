import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

// Use PROJECT_CREATE as screenplay creation limit (10 per hour)

// Validation schema for creating an episode
const createEpisodeSchema = z.object({
  season: z.number().int().min(1).max(99),
  episode: z.number().int().min(1).max(999),
  episodeTitle: z.string().min(1, "Episode title is required").max(255),
})

// POST /api/series/[id]/episodes - Create a new episode in a series
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: seriesId } = await params

    // Rate limiting
    const rateLimitResult = await rateLimit(
      `screenplay-create:${session.user.id}`,
      RATE_LIMITS.PROJECT_CREATE
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    // Verify user owns the series
    const series = await prisma.series.findFirst({
      where: {
        id: seriesId,
        userId: session.user.id,
      },
    })

    if (!series) {
      return NextResponse.json(
        { error: "Series not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = createEpisodeSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { season, episode, episodeTitle } = result.data

    // Check if episode already exists
    const existingEpisode = await prisma.screenplay.findFirst({
      where: {
        seriesId,
        season,
        episode,
      },
    })

    if (existingEpisode) {
      return NextResponse.json(
        { error: `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')} already exists` },
        { status: 400 }
      )
    }

    // Determine format based on series format
    let format = "tv-one-hour"
    if (series.format === "half-hour") {
      format = "tv-half-hour"
    } else if (series.format === "multi-cam") {
      format = "tv-multi-cam"
    }

    // Create the episode screenplay
    const episodeTitle_formatted = `${series.title} - S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')} - ${episodeTitle}`

    const screenplay = await prisma.screenplay.create({
      data: {
        title: episodeTitle_formatted,
        content: "",
        userId: session.user.id,
        seriesId,
        type: "TV",
        format,
        season,
        episode,
        episodeTitle,
        genre: series.genre,
      },
    })

    // Create activity record
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "screenplay_created",
        entityId: screenplay.id,
        entityTitle: screenplay.title,
      },
    })

    return NextResponse.json(screenplay, { status: 201 })
  } catch (error) {
    console.error("Error creating episode:", error)
    return NextResponse.json(
      { error: "Failed to create episode" },
      { status: 500 }
    )
  }
}
