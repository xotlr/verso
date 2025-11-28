import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper to check project access (owner or team member)
async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  })

  if (!project) return false

  // User owns the project directly
  if (project.userId === userId) return true

  // Project is in a team user belongs to
  if (project.team && project.team.members.length > 0) return true

  return false
}

// GET /api/projects/[id] - Get a single project (workspace) with assets
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await params

    const hasAccess = await hasProjectAccess(id, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        team: {
          select: { id: true, name: true },
        },
        screenplays: {
          select: {
            id: true,
            title: true,
            synopsis: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        notes: {
          select: {
            id: true,
            title: true,
            category: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        schedules: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        budgets: {
          select: {
            id: true,
            title: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
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

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    )
  }
}

// Validation schema for updating a project (workspace)
const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  banner: z.string().url().optional().nullable(),
  logo: z.string().url().optional().nullable(),
})

// PUT /api/projects/[id] - Update a project (workspace)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const result = updateProjectSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    // Verify access (owner or team member)
    const hasAccess = await hasProjectAccess(id, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const project = await prisma.project.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Delete a project (screenplays become standalone)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await params

    // For deletion, require ownership OR being team admin/owner
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const isOwner = project.userId === session.user.id
    const isTeamAdmin = project.team?.members[0]?.role === "OWNER" ||
                        project.team?.members[0]?.role === "ADMIN"

    if (!isOwner && !isTeamAdmin) {
      return NextResponse.json(
        { error: "Only project owner or team admins can delete" },
        { status: 403 }
      )
    }

    // Delete project - screenplays will have projectId set to null (SetNull cascade)
    await prisma.project.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    )
  }
}
