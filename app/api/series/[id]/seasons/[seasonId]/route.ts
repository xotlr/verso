import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// GET /api/series/[id]/seasons/[seasonId] - Get a single season with episodes
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: seriesId, seasonId } = await params

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

    const season = await prisma.season.findFirst({
      where: {
        id: seasonId,
        seriesId,
      },
      include: {
        episodes: {
          select: {
            id: true,
            title: true,
            episode: true,
            episodeTitle: true,
            wordCount: true,
            updatedAt: true,
            isFavorite: true,
          },
          orderBy: { episode: "asc" },
        },
        _count: {
          select: { episodes: true },
        },
      },
    })

    if (!season) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(season)
  } catch (error) {
    console.error("Error fetching season:", error)
    return NextResponse.json(
      { error: "Failed to fetch season" },
      { status: 500 }
    )
  }
}

// Validation schema for updating a season
const updateSeasonSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["planning", "writing", "complete"]).optional(),
})

// PATCH /api/series/[id]/seasons/[seasonId] - Update a season
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: seriesId, seasonId } = await params

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

    // Verify season exists in this series
    const existingSeason = await prisma.season.findFirst({
      where: {
        id: seasonId,
        seriesId,
      },
    })

    if (!existingSeason) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = updateSeasonSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const season = await prisma.season.update({
      where: { id: seasonId },
      data: result.data,
      include: {
        episodes: {
          select: {
            id: true,
            title: true,
            episode: true,
            episodeTitle: true,
            wordCount: true,
            updatedAt: true,
          },
          orderBy: { episode: "asc" },
        },
        _count: {
          select: { episodes: true },
        },
      },
    })

    return NextResponse.json(season)
  } catch (error) {
    console.error("Error updating season:", error)
    return NextResponse.json(
      { error: "Failed to update season" },
      { status: 500 }
    )
  }
}

// DELETE /api/series/[id]/seasons/[seasonId] - Delete a season (cascade deletes episodes)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: seriesId, seasonId } = await params

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

    // Get the season with episode count
    const season = await prisma.season.findFirst({
      where: {
        id: seasonId,
        seriesId,
      },
      include: {
        _count: { select: { episodes: true } },
        episodes: { select: { id: true } },
      },
    })

    if (!season) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      )
    }

    // Delete all episodes in this season
    if (season._count.episodes > 0) {
      await prisma.screenplay.deleteMany({
        where: {
          seasonId: seasonId,
        },
      })
    }

    // Delete the season
    await prisma.season.delete({
      where: { id: seasonId },
    })

    return NextResponse.json({
      success: true,
      deletedEpisodes: season._count.episodes,
    })
  } catch (error) {
    console.error("Error deleting season:", error)
    return NextResponse.json(
      { error: "Failed to delete season" },
      { status: 500 }
    )
  }
}
