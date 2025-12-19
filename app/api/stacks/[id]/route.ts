import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// GET /api/stacks/[id] - Get a specific stack with its screenplays
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

    const { id } = await params

    const stack = await prisma.stack.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
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
            logline: true,
          },
          orderBy: { updatedAt: "desc" },
        },
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

    return NextResponse.json(stack)
  } catch (error) {
    console.error("Error fetching stack:", error)
    return NextResponse.json(
      { error: "Failed to fetch stack" },
      { status: 500 }
    )
  }
}

// Validation schema for updating a stack
const updateStackSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  projectId: z.string().nullable().optional(),
})

// PATCH /api/stacks/[id] - Update a stack
export async function PATCH(
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

    const { id } = await params

    // Verify ownership
    const existingStack = await prisma.stack.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingStack) {
      return NextResponse.json(
        { error: "Stack not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = updateStackSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, projectId } = result.data

    // If projectId provided (and not null), verify user owns the project
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

    const stack = await prisma.stack.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(projectId !== undefined && { projectId }),
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

    return NextResponse.json(stack)
  } catch (error) {
    console.error("Error updating stack:", error)
    return NextResponse.json(
      { error: "Failed to update stack" },
      { status: 500 }
    )
  }
}

// DELETE /api/stacks/[id] - Delete a stack (screenplays become standalone)
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

    const { id } = await params

    // Verify ownership
    const existingStack = await prisma.stack.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingStack) {
      return NextResponse.json(
        { error: "Stack not found" },
        { status: 404 }
      )
    }

    // Unlink all screenplays from the stack first (they become standalone)
    await prisma.screenplay.updateMany({
      where: { stackId: id },
      data: { stackId: null },
    })

    // Delete the stack
    await prisma.stack.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting stack:", error)
    return NextResponse.json(
      { error: "Failed to delete stack" },
      { status: 500 }
    )
  }
}
