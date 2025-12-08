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

// GET /api/projects/[id]/roles - List all roles for a project
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: projectId } = await params

    const hasAccess = await hasProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const roles = await prisma.projectRole.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { role: "asc" },
    })

    return NextResponse.json(roles)
  } catch (error) {
    console.error("Error fetching roles:", error)
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    )
  }
}

// Validation schema for creating a role
const createRoleSchema = z.object({
  role: z.string().min(1, "Role is required"),
  name: z.string().optional(),
  userId: z.string().optional().nullable(),
  assignSelf: z.boolean().optional(), // If true, assigns current user
})

// POST /api/projects/[id]/roles - Add a role to a project
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
    const result = createRoleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const hasAccess = await hasProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Determine name and userId based on assignSelf or provided userId
    let finalName = result.data.name
    let finalUserId = result.data.userId

    if (result.data.assignSelf) {
      // Self-assignment: use current user's info
      finalUserId = session.user.id
      finalName = session.user.name || session.user.email || "Me"
    } else if (result.data.userId && !result.data.name) {
      // Adding by userId: fetch the user's name
      const targetUser = await prisma.user.findUnique({
        where: { id: result.data.userId },
        select: { name: true, email: true },
      })
      if (targetUser) {
        finalName = targetUser.name || targetUser.email || "Unknown"
      }
    }

    if (!finalName) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    // Check for duplicate
    const existing = await prisma.projectRole.findUnique({
      where: {
        projectId_role_name: {
          projectId,
          role: result.data.role,
          name: finalName,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "This role assignment already exists" },
        { status: 409 }
      )
    }

    // Also check if user already has this role (if userId provided)
    if (finalUserId) {
      const existingUserRole = await prisma.projectRole.findFirst({
        where: {
          projectId,
          role: result.data.role,
          userId: finalUserId,
        },
      })

      if (existingUserRole) {
        return NextResponse.json(
          { error: "This user already has this role on the project" },
          { status: 409 }
        )
      }
    }

    const role = await prisma.projectRole.create({
      data: {
        projectId,
        role: result.data.role,
        name: finalName,
        userId: finalUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    console.error("Error creating role:", error)
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    )
  }
}
