import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

// Plan limits for stack creation
const PLAN_LIMITS: Record<string, number> = {
  FREE: 10,
  PLUS: 50,
  PRO: 100,
  MAX: 500,
}

// GET /api/stacks - List all stacks for the user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const stacks = await prisma.stack.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        projectId: true,
        project: {
          select: { id: true, name: true },
        },
        screenplays: {
          select: {
            id: true,
            title: true,
            wordCount: true,
            updatedAt: true,
            type: true,
            genre: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        _count: {
          select: { screenplays: true },
        },
      },
    })

    return NextResponse.json(stacks)
  } catch (error) {
    console.error("Error fetching stacks:", error)
    return NextResponse.json(
      { error: "Failed to fetch stacks" },
      { status: 500 }
    )
  }
}

// Validation schema for creating a stack
const createStackSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  projectId: z.string().optional(),
  screenplayIds: z.array(z.string()).optional(),
})

// POST /api/stacks - Create a new stack
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
      `stack-create:${session.user.id}`,
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
    const result = createStackSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, projectId, screenplayIds } = result.data

    // Enforce plan limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    })

    const plan = user?.plan || "FREE"
    const limit = PLAN_LIMITS[plan]

    const stackCount = await prisma.stack.count({
      where: { userId: session.user.id },
    })

    if (stackCount >= limit) {
      return NextResponse.json(
        {
          error: `You've reached the limit of ${limit} stacks on the ${plan} plan. Upgrade to create more.`,
          code: "PLAN_LIMIT_EXCEEDED",
          limit,
          current: stackCount,
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

    // If screenplayIds provided, verify user owns them
    if (screenplayIds && screenplayIds.length > 0) {
      const ownedScreenplays = await prisma.screenplay.count({
        where: {
          id: { in: screenplayIds },
          userId: session.user.id,
        },
      })

      if (ownedScreenplays !== screenplayIds.length) {
        return NextResponse.json(
          { error: "One or more screenplays not found or access denied" },
          { status: 403 }
        )
      }
    }

    // Create stack and optionally add screenplays
    const stack = await prisma.stack.create({
      data: {
        name,
        userId: session.user.id,
        projectId: projectId || null,
        screenplays: screenplayIds
          ? { connect: screenplayIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        screenplays: {
          select: {
            id: true,
            title: true,
            wordCount: true,
            updatedAt: true,
          },
        },
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: { screenplays: true },
        },
      },
    })

    // Create activity record
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "stack_created",
        entityId: stack.id,
        entityTitle: stack.name,
      },
    })

    return NextResponse.json(stack, { status: 201 })
  } catch (error) {
    console.error("Error creating stack:", error)
    return NextResponse.json(
      { error: "Failed to create stack" },
      { status: 500 }
    )
  }
}
