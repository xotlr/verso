import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Helper to check screenplay access
async function checkScreenplayAccess(screenplayId: string, userId: string) {
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    include: {
      project: { select: { teamId: true } },
      team: { select: { id: true } },
    },
  })

  if (!screenplay) {
    return { allowed: false, error: "Screenplay not found", status: 404 }
  }

  // Check if user owns it directly
  if (screenplay.userId === userId) {
    return { allowed: true, screenplay }
  }

  // Check team access
  const teamId = screenplay.teamId || screenplay.project?.teamId
  if (teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    })

    if (membership) {
      return { allowed: true, screenplay }
    }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

// GET /api/screenplays/[id] - Get a screenplay
export async function GET(
  request: NextRequest,
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
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Update lastOpenedAt and fetch screenplay
    const screenplay = await prisma.screenplay.update({
      where: { id },
      data: { lastOpenedAt: new Date() },
      include: {
        project: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(screenplay)
  } catch (error) {
    console.error("Error fetching screenplay:", error)
    return NextResponse.json(
      { error: "Failed to fetch screenplay" },
      { status: 500 }
    )
  }
}

// Validation schema for updating a screenplay
const updateScreenplaySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  synopsis: z.string().optional().nullable(),
  // For optimistic locking - client sends expected timestamp
  expectedUpdatedAt: z.number().optional(),
})

// PUT /api/screenplays/[id] - Update a screenplay
export async function PUT(
  request: NextRequest,
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
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = updateScreenplaySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title, content, synopsis, expectedUpdatedAt } = result.data

    // Validate content size if provided
    if (content !== undefined) {
      const contentSize = new TextEncoder().encode(content).length
      const MAX_CONTENT_SIZE = 5 * 1024 * 1024
      if (contentSize > MAX_CONTENT_SIZE) {
        return NextResponse.json(
          { error: "Content too large. Maximum size is 5MB." },
          { status: 400 }
        )
      }
    }

    // Optimistic locking: check if server version has changed since client last fetched
    if (expectedUpdatedAt !== undefined) {
      const currentScreenplay = await prisma.screenplay.findUnique({
        where: { id },
        select: { updatedAt: true, content: true },
      })

      if (currentScreenplay) {
        const serverUpdatedAt = currentScreenplay.updatedAt.getTime()
        // Allow 1 second tolerance for timing differences
        if (Math.abs(serverUpdatedAt - expectedUpdatedAt) > 1000) {
          return NextResponse.json(
            {
              error: "CONFLICT",
              message: "Server has newer changes",
              serverUpdatedAt,
              serverContent: currentScreenplay.content,
            },
            { status: 409 }
          )
        }
      }
    }

    const screenplay = await prisma.screenplay.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(synopsis !== undefined && { synopsis }),
      },
    })

    return NextResponse.json(screenplay)
  } catch (error) {
    console.error("Error updating screenplay:", error)
    return NextResponse.json(
      { error: "Failed to update screenplay" },
      { status: 500 }
    )
  }
}

// DELETE /api/screenplays/[id] - Delete a screenplay
export async function DELETE(
  request: NextRequest,
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
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    await prisma.screenplay.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting screenplay:", error)
    return NextResponse.json(
      { error: "Failed to delete screenplay" },
      { status: 500 }
    )
  }
}
