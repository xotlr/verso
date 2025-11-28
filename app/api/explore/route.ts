import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Query params validation schema
const exploreQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  genre: z.string().max(100).optional(),
  search: z.string().max(500).optional(),
})

// GET /api/explore - Get public screenplays for exploration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Validate query parameters
    const queryResult = exploreQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      genre: searchParams.get("genre") || undefined,
      search: searchParams.get("search") || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: queryResult.error.issues },
        { status: 400 }
      )
    }

    const { limit, offset, genre, search } = queryResult.data

    // Build where clause for public screenplays
    const where: Record<string, unknown> = {
      isPublic: true,
    }

    if (genre) {
      where.genre = genre
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { synopsis: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get public screenplays with author info
    const [screenplays, total] = await Promise.all([
      prisma.screenplay.findMany({
        where,
        orderBy: [
          { views: "desc" },
          { publishedAt: "desc" },
        ],
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          synopsis: true,
          genre: true,
          views: true,
          publishedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      }),
      prisma.screenplay.count({ where }),
    ])

    return NextResponse.json({
      screenplays,
      total,
      hasMore: offset + screenplays.length < total,
    })
  } catch (error) {
    console.error("Error fetching public screenplays:", error)
    return NextResponse.json(
      { error: "Failed to fetch screenplays" },
      { status: 500 }
    )
  }
}

// GET /api/explore/genres - Get available genres
export async function OPTIONS() {
  try {
    const genres = await prisma.screenplay.findMany({
      where: {
        isPublic: true,
        genre: { not: null },
      },
      select: { genre: true },
      distinct: ["genre"],
    })

    return NextResponse.json(genres.map((g) => g.genre).filter(Boolean))
  } catch (error) {
    console.error("Error fetching genres:", error)
    return NextResponse.json(
      { error: "Failed to fetch genres" },
      { status: 500 }
    )
  }
}
