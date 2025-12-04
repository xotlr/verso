import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/project-role-invites/[token] - Get invite details (public)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invite = await prisma.projectRoleInvite.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            name: true,
            logo: true,
            banner: true,
            description: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: "Invite has expired", expired: true },
        { status: 410 }
      )
    }

    return NextResponse.json(invite)
  } catch (error) {
    console.error("Error fetching invite:", error)
    return NextResponse.json(
      { error: "Failed to fetch invite" },
      { status: 500 }
    )
  }
}

// POST /api/project-role-invites/[token] - Accept invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { token } = await params

    const invite = await prisma.projectRoleInvite.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date() > invite.expiresAt) {
      // Clean up expired invite
      await prisma.projectRoleInvite.delete({ where: { id: invite.id } })
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 410 }
      )
    }

    // Check email matches
    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite is for a different email address" },
        { status: 403 }
      )
    }

    // Check if user already has this role
    const existingRole = await prisma.projectRole.findFirst({
      where: {
        projectId: invite.projectId,
        role: invite.role,
        userId: session.user.id,
      },
    })

    if (existingRole) {
      // Clean up invite since they already have the role
      await prisma.projectRoleInvite.delete({ where: { id: invite.id } })
      return NextResponse.json(
        { error: "You already have this role on the project" },
        { status: 400 }
      )
    }

    // Accept invite: create role and delete invite in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the project role
      const role = await tx.projectRole.create({
        data: {
          projectId: invite.projectId,
          role: invite.role,
          name: session.user.name || session.user.email!,
          userId: session.user.id,
        },
        select: {
          id: true,
          role: true,
          name: true,
          userId: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // Delete the invite
      await tx.projectRoleInvite.delete({ where: { id: invite.id } })

      return role
    })

    return NextResponse.json({
      success: true,
      role: result,
      project: result.project,
    })
  } catch (error) {
    console.error("Error accepting invite:", error)
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    )
  }
}

// DELETE /api/project-role-invites/[token] - Decline invite
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { token } = await params

    const invite = await prisma.projectRoleInvite.findUnique({
      where: { token },
    })

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      )
    }

    // Check email matches (only the invitee can decline)
    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite is for a different email address" },
        { status: 403 }
      )
    }

    // Delete the invite
    await prisma.projectRoleInvite.delete({ where: { id: invite.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error declining invite:", error)
    return NextResponse.json(
      { error: "Failed to decline invite" },
      { status: 500 }
    )
  }
}
