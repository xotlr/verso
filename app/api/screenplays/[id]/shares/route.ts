import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { ShareRole } from "@prisma/client"

/**
 * Access check result with screenplay data.
 * Fetches all needed data in a single query to avoid N+1.
 */
interface ShareAccessResult {
  allowed: boolean
  isOwner: boolean
  screenplay?: {
    userId: string
    teamId: string | null
    projectTeamId: string | null
    owner: { id: string; name: string | null; email: string | null; image: string | null }
  }
  error?: string
  status?: number
}

/**
 * Check if user can manage shares. Single query version.
 * Gets screenplay + owner + user's share + team membership in one go.
 */
async function checkShareAccess(
  screenplayId: string,
  userId: string
): Promise<ShareAccessResult> {
  // Single query that gets everything we need for access check AND owner info
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    select: {
      userId: true,
      teamId: true,
      project: { select: { teamId: true } },
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
      // Include the requesting user's share in this query
      shares: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  })

  if (!screenplay) {
    return { allowed: false, isOwner: false, error: "Screenplay not found", status: 404 }
  }

  // Owner can always manage shares
  if (screenplay.userId === userId) {
    return {
      allowed: true,
      isOwner: true,
      screenplay: {
        userId: screenplay.userId,
        teamId: screenplay.teamId,
        projectTeamId: screenplay.project?.teamId ?? null,
        owner: screenplay.user,
      },
    }
  }

  // Check if user has ADMIN share role (already fetched above)
  const userShare = screenplay.shares[0]
  if (userShare?.role === "ADMIN") {
    return {
      allowed: true,
      isOwner: false,
      screenplay: {
        userId: screenplay.userId,
        teamId: screenplay.teamId,
        projectTeamId: screenplay.project?.teamId ?? null,
        owner: screenplay.user,
      },
    }
  }

  // Check team admin access (only if screenplay is in a team)
  const teamId = screenplay.teamId || screenplay.project?.teamId
  if (teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    })

    if (membership && (membership.role === "OWNER" || membership.role === "ADMIN")) {
      return {
        allowed: true,
        isOwner: false,
        screenplay: {
          userId: screenplay.userId,
          teamId: screenplay.teamId,
          projectTeamId: screenplay.project?.teamId ?? null,
          owner: screenplay.user,
        },
      }
    }
  }

  return { allowed: false, isOwner: false, error: "Access denied", status: 403 }
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

    // Fetch access check, shares, and invites in parallel
    // Access check also returns owner info, eliminating the separate screenplay fetch
    const [access, shares, invites] = await Promise.all([
      checkShareAccess(id, session.user.id),
      prisma.screenplayShare.findMany({
        where: { screenplayId: id },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
          sharer: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.shareInvite.findMany({
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
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    return NextResponse.json({
      owner: access.screenplay?.owner,
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

    const body = await request.json()
    const result = createShareSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { userId: targetUserId, email, role } = result.data

    // If userId provided, create direct share
    if (targetUserId) {
      // Parallelize: access check + target user + existing share check
      const [access, targetUser, existingShare] = await Promise.all([
        checkShareAccess(id, session.user.id),
        prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, name: true, email: true, image: true },
        }),
        prisma.screenplayShare.findUnique({
          where: { screenplayId_userId: { screenplayId: id, userId: targetUserId } },
          select: { id: true },
        }),
      ])

      if (!access.allowed) {
        return NextResponse.json(
          { error: access.error },
          { status: access.status }
        )
      }

      if (!targetUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

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
          userId: targetUserId,
          role: role as ShareRole,
          sharedBy: session.user.id,
        },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      })

      return NextResponse.json(share, { status: 201 })
    }

    // If email provided, create invite or direct share if user exists
    if (email) {
      // Parallelize: access check + user lookup by email
      const [access, existingUser] = await Promise.all([
        checkShareAccess(id, session.user.id),
        prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, email: true, image: true },
        }),
      ])

      if (!access.allowed) {
        return NextResponse.json(
          { error: access.error },
          { status: access.status }
        )
      }

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
              select: { id: true, name: true, email: true, image: true },
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
