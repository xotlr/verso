import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

// Plan limits for series creation
const PLAN_LIMITS: Record<string, number> = {
  FREE: 2,
  PLUS: 10,
  PRO: 25,
  MAX: 100,
}

// GET /api/series - List all series for the user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const series = await prisma.series.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        logline: true,
        genre: true,
        format: true,
        createdAt: true,
        updatedAt: true,
        projectId: true,
        project: {
          select: { id: true, name: true },
        },
        episodes: {
          select: {
            id: true,
            title: true,
            season: true,
            episode: true,
            episodeTitle: true,
            wordCount: true,
            updatedAt: true,
          },
          orderBy: [
            { season: "asc" },
            { episode: "asc" },
          ],
        },
        _count: {
          select: { episodes: true },
        },
      },
    })

    return NextResponse.json(series)
  } catch (error) {
    console.error("Error fetching series:", error)
    return NextResponse.json(
      { error: "Failed to fetch series" },
      { status: 500 }
    )
  }
}

// Validation schema for creating a series
const createSeriesSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  logline: z.string().optional(),
  genre: z.string().optional(),
  format: z.enum(["one-hour", "half-hour", "multi-cam"]).optional(),
  projectId: z.string().optional(),
})

// POST /api/series - Create a new series
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(
      `series-create:${session.user.id}`,
      RATE_LIMITS.PROJECT_CREATE // Reuse project rate limit
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

    const body = await request.json()
    const result = createSeriesSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title, logline, genre, format, projectId } = result.data

    // Enforce plan limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    })

    const plan = user?.plan || "FREE"
    const limit = PLAN_LIMITS[plan]

    const seriesCount = await prisma.series.count({
      where: { userId: session.user.id },
    })

    if (seriesCount >= limit) {
      return NextResponse.json(
        {
          error: `You've reached the limit of ${limit} series on the ${plan} plan. Upgrade to create more.`,
          code: "PLAN_LIMIT_EXCEEDED",
          limit,
          current: seriesCount,
        },
        { status: 403 }
      )
    }

    // If projectId provided, verify user owns the project
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: session.user.id,
        },
      })

      if (!project) {
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 403 }
        )
      }
    }

    const series = await prisma.series.create({
      data: {
        title,
        logline,
        genre,
        format,
        userId: session.user.id,
        projectId: projectId || null,
      },
    })

    // Create activity record
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "series_created",
        entityId: series.id,
        entityTitle: series.title,
      },
    })

    return NextResponse.json(series, { status: 201 })
  } catch (error) {
    console.error("Error creating series:", error)
    return NextResponse.json(
      { error: "Failed to create series" },
      { status: 500 }
    )
  }
}
