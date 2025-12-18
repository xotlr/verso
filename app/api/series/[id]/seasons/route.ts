import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// GET /api/series/[id]/seasons - List all seasons for a series
export async function GET(
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

    const seasons = await prisma.season.findMany({
      where: { seriesId },
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
      orderBy: { number: "asc" },
    })

    return NextResponse.json(seasons)
  } catch (error) {
    console.error("Error fetching seasons:", error)
    return NextResponse.json(
      { error: "Failed to fetch seasons" },
      { status: 500 }
    )
  }
}

// Validation schema for creating a season
const createSeasonSchema = z.object({
  number: z.number().int().min(1).max(99),
  title: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["planning", "writing", "complete"]).optional(),
})

// POST /api/series/[id]/seasons - Create a new season
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
    const result = createSeasonSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { number, title, description, status } = result.data

    // Check if season number already exists
    const existingSeason = await prisma.season.findFirst({
      where: {
        seriesId,
        number,
      },
    })

    if (existingSeason) {
      return NextResponse.json(
        { error: `Season ${number} already exists` },
        { status: 400 }
      )
    }

    const season = await prisma.season.create({
      data: {
        number,
        title: title || null,
        description: description || null,
        status: status || "planning",
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
          },
          orderBy: { episode: "asc" },
        },
        _count: {
          select: { episodes: true },
        },
      },
    })

    return NextResponse.json(season, { status: 201 })
  } catch (error) {
    console.error("Error creating season:", error)
    return NextResponse.json(
      { error: "Failed to create season" },
      { status: 500 }
    )
  }
}
