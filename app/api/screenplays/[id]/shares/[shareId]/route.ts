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

// Validation schema for updating a share
const updateShareSchema = z.object({
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR", "ADMIN"]),
})

// PATCH /api/screenplays/[id]/shares/[shareId] - Update share permission
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id, shareId } = await params
    const access = await canManageShares(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = updateShareSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    // Check if this is a share or invite
    const share = await prisma.screenplayShare.findUnique({
      where: { id: shareId },
    })

    if (share) {
      // Can't demote yourself if you're not the owner
      if (share.userId === session.user.id && !access.isOwner) {
        return NextResponse.json(
          { error: "Cannot change your own permissions" },
          { status: 400 }
        )
      }

      const updatedShare = await prisma.screenplayShare.update({
        where: { id: shareId },
        data: { role: result.data.role as ShareRole },
        select: {
          id: true,
          role: true,
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

      return NextResponse.json(updatedShare)
    }

    // Check if it's an invite
    const invite = await prisma.shareInvite.findUnique({
      where: { id: shareId },
    })

    if (invite && invite.screenplayId === id) {
      const updatedInvite = await prisma.shareInvite.update({
        where: { id: shareId },
        data: { role: result.data.role as ShareRole },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
        },
      })

      return NextResponse.json({ type: "invite", invite: updatedInvite })
    }

    return NextResponse.json(
      { error: "Share not found" },
      { status: 404 }
    )
  } catch (error) {
    console.error("Error updating share:", error)
    return NextResponse.json(
      { error: "Failed to update share" },
      { status: 500 }
    )
  }
}

// DELETE /api/screenplays/[id]/shares/[shareId] - Revoke share or cancel invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id, shareId } = await params
    const access = await canManageShares(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Try to delete share first
    const share = await prisma.screenplayShare.findUnique({
      where: { id: shareId },
    })

    if (share && share.screenplayId === id) {
      await prisma.screenplayShare.delete({
        where: { id: shareId },
      })

      return NextResponse.json({ success: true })
    }

    // Try to delete invite
    const invite = await prisma.shareInvite.findUnique({
      where: { id: shareId },
    })

    if (invite && invite.screenplayId === id) {
      await prisma.shareInvite.delete({
        where: { id: shareId },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: "Share not found" },
      { status: 404 }
    )
  } catch (error) {
    console.error("Error deleting share:", error)
    return NextResponse.json(
      { error: "Failed to delete share" },
      { status: 500 }
    )
  }
}
