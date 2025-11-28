import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

// Plan limits for screenplay creation
const PLAN_LIMITS = {
  FREE: 3,
  PRO: 50,
  TEAM: 100,
} as const

// GET /api/screenplays - List all screenplays for the user (standalone and in projects)
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const standalone = searchParams.get("standalone")
    const teamId = searchParams.get("teamId")

    let where: Prisma.ScreenplayWhereInput

    if (projectId) {
      // Get screenplays for a specific project
      where = { projectId }
    } else if (standalone === "true") {
      // Get only standalone screenplays (no project)
      where = {
        userId: session.user.id,
        projectId: null,
      }
    } else if (teamId) {
      // Get team screenplays
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: session.user.id,
          },
        },
      })

      if (!membership) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        )
      }

      where = { teamId }
    } else {
      // Return all user's screenplays (personal + team)
      where = {
        OR: [
          { userId: session.user.id },
          { team: { members: { some: { userId: session.user.id } } } },
        ],
      }
    }

    // Pagination params
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")

    const [screenplays, total] = await Promise.all([
      prisma.screenplay.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          // NOTE: content is intentionally excluded - fetch separately via /api/screenplays/[id]
          synopsis: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
          teamId: true,
          project: {
            select: { id: true, name: true },
          },
          team: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.screenplay.count({ where }),
    ])

    const response = NextResponse.json({
      screenplays,
      total,
      hasMore: offset + screenplays.length < total,
    })

    // Cache for 1 minute (private since user-specific)
    response.headers.set("Cache-Control", "private, max-age=60")
    return response
  } catch (error) {
    console.error("Error fetching screenplays:", error)
    return NextResponse.json(
      { error: "Failed to fetch screenplays" },
      { status: 500 }
    )
  }
}

// Validation schema for creating a screenplay
const createScreenplaySchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().default(""),
  synopsis: z.string().optional(),
  projectId: z.string().optional(),
  teamId: z.string().optional(),
})

// POST /api/screenplays - Create a new screenplay
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
    const rateLimitResult = rateLimit(
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

    const body = await request.json()
    const result = createScreenplaySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title, content, synopsis, projectId, teamId } = result.data

    // Enforce plan limits for standalone screenplays
    if (!projectId && !teamId) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { plan: true },
      })

      const plan = user?.plan || "FREE"
      const limit = PLAN_LIMITS[plan]

      const screenplayCount = await prisma.screenplay.count({
        where: { userId: session.user.id, projectId: null, teamId: null },
      })

      if (screenplayCount >= limit) {
        return NextResponse.json(
          {
            error: `You've reached the limit of ${limit} standalone screenplays on the ${plan} plan. Upgrade or add to a project.`,
            code: "PLAN_LIMIT_EXCEEDED",
            limit,
            current: screenplayCount,
          },
          { status: 403 }
        )
      }
    }

    // If projectId provided, verify user owns it or is a team member
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true, teamId: true },
      })

      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        )
      }

      if (project.userId !== session.user.id) {
        if (project.teamId) {
          const membership = await prisma.teamMember.findUnique({
            where: {
              teamId_userId: {
                teamId: project.teamId,
                userId: session.user.id,
              },
            },
          })

          if (!membership) {
            return NextResponse.json(
              { error: "Access denied to project" },
              { status: 403 }
            )
          }
        } else {
          return NextResponse.json(
            { error: "Access denied to project" },
            { status: 403 }
          )
        }
      }
    }

    // If teamId provided, verify membership
    if (teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: session.user.id,
          },
        },
      })

      if (!membership) {
        return NextResponse.json(
          { error: "Access denied to team" },
          { status: 403 }
        )
      }
    }

    // Validate content size (max 5MB)
    const contentSize = new TextEncoder().encode(content || "").length
    const MAX_CONTENT_SIZE = 5 * 1024 * 1024
    if (contentSize > MAX_CONTENT_SIZE) {
      return NextResponse.json(
        { error: "Content too large. Maximum size is 5MB." },
        { status: 400 }
      )
    }

    const screenplay = await prisma.screenplay.create({
      data: {
        title,
        content,
        synopsis,
        userId: session.user.id,
        projectId: projectId || null,
        teamId: teamId || null,
      },
    })

    return NextResponse.json(screenplay, { status: 201 })
  } catch (error) {
    console.error("Error creating screenplay:", error)
    return NextResponse.json(
      { error: "Failed to create screenplay" },
      { status: 500 }
    )
  }
}
