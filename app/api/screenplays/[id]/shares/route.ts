import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { ShareRole } from "@prisma/client"

// Helper to check if user can manage shares (owner or ADMIN share role)
async function canManageShares(screenplayId: string, userId: string) {
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    select: {
      userId: true,
      project: { select: { teamId: true } },
      teamId: true,
    },
  })

  if (!screenplay) {
    return { allowed: false, error: "Screenplay not found", status: 404 }
  }

  // Owner can always manage shares
  if (screenplay.userId === userId) {
    return { allowed: true, isOwner: true }
  }

  // Check if user has ADMIN share role
  const share = await prisma.screenplayShare.findUnique({
    where: {
      screenplayId_userId: {
        screenplayId,
        userId,
      },
    },
  })

  if (share?.role === "ADMIN") {
    return { allowed: true, isOwner: false }
  }

  // Check team admin access
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

    if (membership && (membership.role === "OWNER" || membership.role === "ADMIN")) {
      return { allowed: true, isOwner: false }
    }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

// GET /api/screenplays/[id]/shares - List all shares for a screenplay
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
    const access = await canManageShares(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Get all shares
    const shares = await prisma.screenplayShare.findMany({
      where: { screenplayId: id },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        sharer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Get pending invites
    const invites = await prisma.shareInvite.findMany({
      where: {
        screenplayId: id,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
        inviter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Get screenplay owner info
    const screenplay = await prisma.screenplay.findUnique({
      where: { id },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json({
      owner: screenplay?.user,
      shares,
      pendingInvites: invites,
    })
  } catch (error) {
    console.error("Error fetching shares:", error)
    return NextResponse.json(
      { error: "Failed to fetch shares" },
      { status: 500 }
    )
  }
}

// Validation schema for creating a share
const createShareSchema = z.object({
  // Either userId (for existing users) or email (for invites)
  userId: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR", "ADMIN"]).default("VIEWER"),
}).refine(
  (data) => data.userId || data.email,
  { message: "Either userId or email is required" }
)

// POST /api/screenplays/[id]/shares - Create a new share or invite
export async function POST(
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
    const access = await canManageShares(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = createShareSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { userId, email, role } = result.data

    // If userId provided, create direct share
    if (userId) {
      // Check user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true },
      })

      if (!targetUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      // Check if share already exists
      const existingShare = await prisma.screenplayShare.findUnique({
        where: {
          screenplayId_userId: {
            screenplayId: id,
            userId,
          },
        },
      })

      if (existingShare) {
        return NextResponse.json(
          { error: "User already has access to this screenplay" },
          { status: 400 }
        )
      }

      // Create share
      const share = await prisma.screenplayShare.create({
        data: {
          screenplayId: id,
          userId,
          role: role as ShareRole,
          sharedBy: session.user.id,
        },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })

      return NextResponse.json(share, { status: 201 })
    }

    // If email provided, create invite or direct share if user exists
    if (email) {
      // Check if user exists with this email
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, image: true },
      })

      if (existingUser) {
        // Check if share already exists
        const existingShare = await prisma.screenplayShare.findUnique({
          where: {
            screenplayId_userId: {
              screenplayId: id,
              userId: existingUser.id,
            },
          },
        })

        if (existingShare) {
          return NextResponse.json(
            { error: "User already has access to this screenplay" },
            { status: 400 }
          )
        }

        // Create direct share
        const share = await prisma.screenplayShare.create({
          data: {
            screenplayId: id,
            userId: existingUser.id,
            role: role as ShareRole,
            sharedBy: session.user.id,
          },
          select: {
            id: true,
            role: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        })

        return NextResponse.json(share, { status: 201 })
      }

      // User doesn't exist, create invite
      // Check if invite already exists
      const existingInvite = await prisma.shareInvite.findFirst({
        where: {
          screenplayId: id,
          email,
          expiresAt: { gt: new Date() },
        },
      })

      if (existingInvite) {
        return NextResponse.json(
          { error: "Invite already sent to this email" },
          { status: 400 }
        )
      }

      // Create invite (expires in 7 days)
      const invite = await prisma.shareInvite.create({
        data: {
          screenplayId: id,
          email,
          role: role as ShareRole,
          invitedBy: session.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        select: {
          id: true,
          email: true,
          role: true,
          token: true,
          createdAt: true,
          expiresAt: true,
        },
      })

      // TODO: Send email notification

      return NextResponse.json({
        type: "invite",
        invite,
        message: `Invite sent to ${email}`,
      }, { status: 201 })
    }

    return NextResponse.json(
      { error: "Either userId or email is required" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error creating share:", error)
    return NextResponse.json(
      { error: "Failed to create share" },
      { status: 500 }
    )
  }
}
