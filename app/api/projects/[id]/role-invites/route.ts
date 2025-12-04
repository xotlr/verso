import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// GET /api/projects/[id]/role-invites - List pending invites for a project
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

    const { id: projectId } = await params

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { team: { members: { some: { userId: session.user.id } } } },
        ],
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Get pending invites (not expired)
    const invites = await prisma.projectRoleInvite.findMany({
      where: {
        projectId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        expiresAt: true,
        createdAt: true,
        inviter: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(invites)
  } catch (error) {
    console.error("Error fetching project role invites:", error)
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    )
  }
}

// Validation schema for creating an invite
const createInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
})

// POST /api/projects/[id]/role-invites - Create a new invite
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

    const { id: projectId } = await params

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { team: { members: { some: { userId: session.user.id } } } },
        ],
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = createInviteSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, role } = result.data
    const normalizedEmail = email.toLowerCase()

    // Check if user is already a team member with this role
    const existingRole = await prisma.projectRole.findFirst({
      where: {
        projectId,
        role,
        user: { email: normalizedEmail },
      },
    })

    if (existingRole) {
      return NextResponse.json(
        { error: "User already has this role on the project" },
        { status: 400 }
      )
    }

    // Check for existing pending invite
    const existingInvite = await prisma.projectRoleInvite.findFirst({
      where: {
        projectId,
        email: normalizedEmail,
        role,
        expiresAt: { gt: new Date() },
      },
    })

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invite for this email and role is already pending" },
        { status: 400 }
      )
    }

    // Create invite with 7-day expiry
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.projectRoleInvite.create({
      data: {
        projectId,
        email: normalizedEmail,
        role,
        expiresAt,
        invitedBy: session.user.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        expiresAt: true,
        createdAt: true,
        inviter: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    // Generate invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/project-invite/${invite.token}`

    return NextResponse.json({
      ...invite,
      inviteUrl,
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating project role invite:", error)
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    )
  }
}
