import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper to check project access
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
  if (project.userId === userId) return true
  if (project.team && project.team.members.length > 0) return true

  return false
}

// Helper to check if user owns the project
async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })
  return project?.userId === userId
}

// GET /api/projects/[id]/role-needs - List all role needs for a project
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: projectId } = await params

    // Check if project is public or user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { isPublic: true, userId: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Get current user for owner check
    const session = await auth()
    const isOwner = session?.user?.id === project.userId

    // If project is not public, require authentication
    if (!project.isPublic) {
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      }

      const hasAccess = await hasProjectAccess(projectId, session.user.id)
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        )
      }
    }

    const roleNeeds = await prisma.projectRoleNeed.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      // Include application count for owners
      ...(isOwner ? {
        include: {
          _count: {
            select: {
              applications: true,
            },
          },
        },
      } : {}),
    })

    return NextResponse.json(roleNeeds)
  } catch (error) {
    console.error("Error fetching role needs:", error)
    return NextResponse.json(
      { error: "Failed to fetch role needs" },
      { status: 500 }
    )
  }
}

// Validation schema for creating a role need
const createRoleNeedSchema = z.object({
  role: z.string().min(1, "Role is required"),
  description: z.string().max(1000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  isPaid: z.boolean().default(false),
})

// POST /api/projects/[id]/role-needs - Add a role need to a project
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: projectId } = await params
    const body = await request.json()
    const result = createRoleNeedSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    // Only project owner can add role needs
    const isOwner = await isProjectOwner(projectId, session.user.id)
    if (!isOwner) {
      return NextResponse.json(
        { error: "Only project owner can add role needs" },
        { status: 403 }
      )
    }

    const roleNeed = await prisma.projectRoleNeed.create({
      data: {
        projectId,
        role: result.data.role,
        description: result.data.description,
        location: result.data.location,
        isPaid: result.data.isPaid,
      },
    })

    return NextResponse.json(roleNeed, { status: 201 })
  } catch (error) {
    console.error("Error creating role need:", error)
    return NextResponse.json(
      { error: "Failed to create role need" },
      { status: 500 }
    )
  }
}
