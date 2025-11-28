import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

// Plan limits for project (workspace) creation
const PLAN_LIMITS = {
  FREE: 1,
  PRO: 10,
  TEAM: 25,
} as const

// GET /api/projects - List all projects (workspaces) for the user
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
    const teamId = searchParams.get("teamId")

    let where: Prisma.ProjectWhereInput

    if (teamId) {
      // If teamId provided, check user is a member and return team projects
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
      // Return user's personal projects AND projects from teams they're in
      where = {
        OR: [
          { userId: session.user.id, teamId: null },
          { team: { members: { some: { userId: session.user.id } } } },
        ],
      }
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        coverImage: true,
        createdAt: true,
        updatedAt: true,
        teamId: true,
        team: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            screenplays: true,
            notes: true,
            schedules: true,
            budgets: true,
          },
        },
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    )
  }
}

// Validation schema for creating a project (workspace)
const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  teamId: z.string().optional(),
})

// POST /api/projects - Create a new project (workspace)
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
      `project-create:${session.user.id}`,
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
    const result = createProjectSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, description, teamId } = result.data

    // Enforce plan limits for personal projects
    if (!teamId) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { plan: true },
      })

      const plan = user?.plan || "FREE"
      const limit = PLAN_LIMITS[plan]

      const projectCount = await prisma.project.count({
        where: { userId: session.user.id, teamId: null },
      })

      if (projectCount >= limit) {
        return NextResponse.json(
          {
            error: `You've reached the limit of ${limit} projects on the ${plan} plan. Upgrade to create more.`,
            code: "PLAN_LIMIT_EXCEEDED",
            limit,
            current: projectCount,
          },
          { status: 403 }
        )
      }
    }

    // If teamId provided, verify user is a member
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

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: session.user.id,
        teamId: teamId || null,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}
