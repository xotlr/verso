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

// Validation schema
const createFromDropSchema = z.object({
  draggedId: z.string().min(1, "Dragged screenplay ID required"),
  targetId: z.string().min(1, "Target screenplay ID required"),
  projectId: z.string().optional(), // Optional: inherit from project context
})

// POST /api/stacks/create-from-drop - Atomically create a stack from two screenplays
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
    const result = createFromDropSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { draggedId, targetId, projectId } = result.data

    // Can't stack a screenplay onto itself
    if (draggedId === targetId) {
      return NextResponse.json(
        { error: "Cannot stack a screenplay onto itself" },
        { status: 400 }
      )
    }

    // Verify user owns both screenplays
    const screenplays = await prisma.screenplay.findMany({
      where: {
        id: { in: [draggedId, targetId] },
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        stackId: true,
        projectId: true,
      },
    })

    if (screenplays.length !== 2) {
      return NextResponse.json(
        { error: "One or more screenplays not found or access denied" },
        { status: 403 }
      )
    }

    const draggedScreenplay = screenplays.find((s) => s.id === draggedId)!
    const targetScreenplay = screenplays.find((s) => s.id === targetId)!

    // Check if target is already in a stack - if so, add dragged to that stack
    if (targetScreenplay.stackId) {
      // Verify the stack belongs to the user
      const existingStack = await prisma.stack.findFirst({
        where: {
          id: targetScreenplay.stackId,
          userId: session.user.id,
        },
      })

      if (existingStack) {
        // Add dragged screenplay to existing stack
        await prisma.screenplay.update({
          where: { id: draggedId },
          data: { stackId: existingStack.id },
        })

        const updatedStack = await prisma.stack.findUnique({
          where: { id: existingStack.id },
          include: {
            screenplays: {
              select: {
                id: true,
                title: true,
                wordCount: true,
                updatedAt: true,
                type: true,
              },
              orderBy: { updatedAt: "desc" },
            },
            project: {
              select: { id: true, name: true },
            },
            _count: {
              select: { screenplays: true },
            },
          },
        })

        return NextResponse.json({
          stack: updatedStack,
          action: "added_to_existing",
        })
      }
    }

    // If dragged screenplay is in a stack, remove it first
    if (draggedScreenplay.stackId) {
      await prisma.screenplay.update({
        where: { id: draggedId },
        data: { stackId: null },
      })

      // Check if old stack should be dissolved
      const oldStackCount = await prisma.screenplay.count({
        where: { stackId: draggedScreenplay.stackId },
      })

      if (oldStackCount <= 1) {
        if (oldStackCount === 1) {
          await prisma.screenplay.updateMany({
            where: { stackId: draggedScreenplay.stackId },
            data: { stackId: null },
          })
        }
        await prisma.stack.delete({
          where: { id: draggedScreenplay.stackId },
        })
      }
    }

    // Enforce plan limits for new stack creation
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

    // Determine project context - inherit from screenplays if not provided
    const effectiveProjectId =
      projectId ||
      targetScreenplay.projectId ||
      draggedScreenplay.projectId ||
      null

    // Create a new stack with both screenplays
    // Use target screenplay's title as the stack name
    const stack = await prisma.stack.create({
      data: {
        name: `${targetScreenplay.title} Stack`,
        userId: session.user.id,
        projectId: effectiveProjectId,
        screenplays: {
          connect: [{ id: draggedId }, { id: targetId }],
        },
      },
      include: {
        screenplays: {
          select: {
            id: true,
            title: true,
            wordCount: true,
            updatedAt: true,
            type: true,
          },
          orderBy: { updatedAt: "desc" },
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
        metadata: {
          screenplayIds: [draggedId, targetId],
        },
      },
    })

    return NextResponse.json(
      {
        stack,
        action: "created_new",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating stack from drop:", error)
    return NextResponse.json(
      { error: "Failed to create stack" },
      { status: 500 }
    )
  }
}
