import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ id: string; needId: string }>
}

// Helper to check if user owns the project
async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })
  return project?.userId === userId
}

// GET /api/projects/[id]/role-needs/[needId]/applications - List applications (owner only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: projectId, needId } = await params

    // Only project owner can view applications
    const isOwner = await isProjectOwner(projectId, session.user.id)
    if (!isOwner) {
      return NextResponse.json(
        { error: "Only project owner can view applications" },
        { status: 403 }
      )
    }

    // Verify role need exists and belongs to project
    const roleNeed = await prisma.projectRoleNeed.findFirst({
      where: {
        id: needId,
        projectId,
      },
    })

    if (!roleNeed) {
      return NextResponse.json(
        { error: "Role need not found" },
        { status: 404 }
      )
    }

    const applications = await prisma.projectRoleApplication.findMany({
      where: { roleNeedId: needId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        message: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            title: true,
            bio: true,
            location: true,
          },
        },
      },
    })

    return NextResponse.json({ applications })
  } catch (error) {
    console.error("Error fetching applications:", error)
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    )
  }
}

// Validation schema for creating an application
const createApplicationSchema = z.object({
  message: z.string().max(1000).optional().nullable(),
})

// POST /api/projects/[id]/role-needs/[needId]/applications - Submit application
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: projectId, needId } = await params

    // Rate limiting
    const rateLimitResult = await rateLimit(
      `role-application:${session.user.id}`,
      RATE_LIMITS.API
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
    const result = createApplicationSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    // Verify role need exists and belongs to a public project
    const roleNeed = await prisma.projectRoleNeed.findFirst({
      where: {
        id: needId,
        projectId,
        project: {
          isPublic: true,
        },
      },
      include: {
        project: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
    })

    if (!roleNeed) {
      return NextResponse.json(
        { error: "Role need not found or project is not public" },
        { status: 404 }
      )
    }

    // Prevent project owner from applying to their own roles
    if (roleNeed.project.userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot apply to your own project's roles" },
        { status: 400 }
      )
    }

    // Check if user already applied
    const existingApplication = await prisma.projectRoleApplication.findUnique({
      where: {
        roleNeedId_userId: {
          roleNeedId: needId,
          userId: session.user.id,
        },
      },
    })

    if (existingApplication) {
      return NextResponse.json(
        { error: "You have already applied for this role" },
        { status: 409 }
      )
    }

    const application = await prisma.projectRoleApplication.create({
      data: {
        roleNeedId: needId,
        userId: session.user.id,
        message: result.data.message || null,
      },
    })

    // Create activity record
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "role_application",
        entityId: projectId,
        entityTitle: roleNeed.project.name,
      },
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error("Error creating application:", error)
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    )
  }
}
