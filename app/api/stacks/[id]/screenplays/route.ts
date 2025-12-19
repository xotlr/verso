import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schema
const screenplayIdsSchema = z.object({
  screenplayIds: z.array(z.string()).min(1, "At least one screenplay required"),
})

// POST /api/stacks/[id]/screenplays - Add screenplay(s) to a stack
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

    const { id: stackId } = await params

    // Verify stack ownership
    const stack = await prisma.stack.findFirst({
      where: {
        id: stackId,
        userId: session.user.id,
      },
    })

    if (!stack) {
      return NextResponse.json(
        { error: "Stack not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = screenplayIdsSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { screenplayIds } = result.data

    // Verify user owns all screenplays
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

    // Update screenplays to belong to this stack
    // Also inherit projectId from stack if stack has one
    await prisma.screenplay.updateMany({
      where: { id: { in: screenplayIds } },
      data: {
        stackId,
        ...(stack.projectId && { projectId: stack.projectId }),
      },
    })

    // Return updated stack
    const updatedStack = await prisma.stack.findUnique({
      where: { id: stackId },
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

    return NextResponse.json(updatedStack)
  } catch (error) {
    console.error("Error adding screenplays to stack:", error)
    return NextResponse.json(
      { error: "Failed to add screenplays to stack" },
      { status: 500 }
    )
  }
}

// DELETE /api/stacks/[id]/screenplays - Remove screenplay(s) from a stack
export async function DELETE(
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

    const { id: stackId } = await params

    // Verify stack ownership
    const stack = await prisma.stack.findFirst({
      where: {
        id: stackId,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: { screenplays: true },
        },
      },
    })

    if (!stack) {
      return NextResponse.json(
        { error: "Stack not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = screenplayIdsSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { screenplayIds } = result.data

    // Remove screenplays from stack (make them standalone)
    await prisma.screenplay.updateMany({
      where: {
        id: { in: screenplayIds },
        stackId: stackId,
        userId: session.user.id,
      },
      data: { stackId: null },
    })

    // Check if stack is now empty or has only one item
    const remainingCount = await prisma.screenplay.count({
      where: { stackId },
    })

    // Auto-dissolve stack if it has 1 or fewer items
    if (remainingCount <= 1) {
      // If 1 item remains, unlink it first
      if (remainingCount === 1) {
        await prisma.screenplay.updateMany({
          where: { stackId },
          data: { stackId: null },
        })
      }

      // Delete the empty stack
      await prisma.stack.delete({
        where: { id: stackId },
      })

      return NextResponse.json({
        success: true,
        dissolved: true,
        message: "Stack was automatically dissolved",
      })
    }

    // Return updated stack
    const updatedStack = await prisma.stack.findUnique({
      where: { id: stackId },
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

    return NextResponse.json(updatedStack)
  } catch (error) {
    console.error("Error removing screenplays from stack:", error)
    return NextResponse.json(
      { error: "Failed to remove screenplays from stack" },
      { status: 500 }
    )
  }
}
