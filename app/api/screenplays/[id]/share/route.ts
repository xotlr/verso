import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { SharePermission } from "@prisma/client"

// Helper to check screenplay ownership
async function checkScreenplayOwnership(screenplayId: string, userId: string) {
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    include: {
      project: { select: { teamId: true } },
      team: { select: { id: true } },
      shareLink: true,
    },
  })

  if (!screenplay) {
    return { allowed: false, error: "Screenplay not found", status: 404, screenplay: null }
  }

  // Check if user owns it directly
  if (screenplay.userId === userId) {
    return { allowed: true, screenplay }
  }

  // Check team access (any team member can manage share settings)
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

  return { allowed: false, error: "Access denied", status: 403, screenplay: null }
}

const createShareSchema = z.object({
  permission: z.enum(["VIEW", "COMMENT", "EDIT"]).default("VIEW"),
  expiresAt: z.string().datetime().optional().nullable(),
})

const updateShareSchema = z.object({
  permission: z.enum(["VIEW", "COMMENT", "EDIT"]).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
})

// GET /api/screenplays/[id]/share - Get share settings
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
    const access = await checkScreenplayOwnership(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const shareLink = access.screenplay?.shareLink

    if (!shareLink) {
      return NextResponse.json({ shareLink: null })
    }

    // Build the share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
    const shareUrl = `${baseUrl}/shared/${shareLink.token}`

    return NextResponse.json({
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        permission: shareLink.permission,
        isActive: shareLink.isActive,
        expiresAt: shareLink.expiresAt,
        url: shareUrl,
        createdAt: shareLink.createdAt,
        updatedAt: shareLink.updatedAt,
      },
    })
  } catch (error) {
    console.error("[SHARE_GET]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/screenplays/[id]/share - Create or regenerate share link
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
    const access = await checkScreenplayOwnership(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const validation = createShareSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { permission, expiresAt } = validation.data

    // Upsert the share link (create new or update existing with new token)
    const shareLink = await prisma.shareLink.upsert({
      where: { screenplayId: id },
      create: {
        screenplayId: id,
        permission: permission as SharePermission,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
      update: {
        // Generate new token by deleting and recreating
        // We use upsert to create, but for token regeneration we need to update
        permission: permission as SharePermission,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
    })

    // Build the share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
    const shareUrl = `${baseUrl}/shared/${shareLink.token}`

    return NextResponse.json({
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        permission: shareLink.permission,
        isActive: shareLink.isActive,
        expiresAt: shareLink.expiresAt,
        url: shareUrl,
        createdAt: shareLink.createdAt,
        updatedAt: shareLink.updatedAt,
      },
    })
  } catch (error) {
    console.error("[SHARE_POST]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH /api/screenplays/[id]/share - Update share settings
export async function PATCH(
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
    const access = await checkScreenplayOwnership(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    if (!access.screenplay?.shareLink) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = updateShareSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { permission, expiresAt, isActive } = validation.data

    const shareLink = await prisma.shareLink.update({
      where: { screenplayId: id },
      data: {
        ...(permission && { permission: permission as SharePermission }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    // Build the share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
    const shareUrl = `${baseUrl}/shared/${shareLink.token}`

    return NextResponse.json({
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        permission: shareLink.permission,
        isActive: shareLink.isActive,
        expiresAt: shareLink.expiresAt,
        url: shareUrl,
        createdAt: shareLink.createdAt,
        updatedAt: shareLink.updatedAt,
      },
    })
  } catch (error) {
    console.error("[SHARE_PATCH]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/screenplays/[id]/share - Revoke share link
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
    const access = await checkScreenplayOwnership(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    if (!access.screenplay?.shareLink) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 }
      )
    }

    await prisma.shareLink.delete({
      where: { screenplayId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[SHARE_DELETE]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
