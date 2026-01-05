import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { z } from "zod"

// GET /api/screenplays/[id] - Get a screenplay
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
    const userId = session.user.id

    // Single query that fetches screenplay + access check data + all needed relations
    // This replaces the separate checkScreenplayAccess call + update fetch
    const screenplay = await prisma.screenplay.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, teamId: true } },
        team: { select: { id: true, name: true } },
        series: { select: { id: true, title: true } },
        seasonRef: { select: { id: true, number: true, title: true } },
        // Include user's share for access check
        shares: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
    })

    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found" },
        { status: 404 }
      )
    }

    // Inline access check using fetched data
    let hasAccess = false

    // Owner has access
    if (screenplay.userId === userId) {
      hasAccess = true
    }
    // User has a share (any role grants VIEWER access for GET)
    else if (screenplay.shares.length > 0) {
      hasAccess = true
    }
    // Check team membership only if screenplay is in a team
    else {
      const teamId = screenplay.teamId || screenplay.project?.teamId
      if (teamId) {
        const membership = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId, userId } },
          select: { role: true },
        })
        if (membership) {
          hasAccess = true
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Update lastOpenedAt (minimal query)
    await prisma.screenplay.update({
      where: { id },
      data: { lastOpenedAt: new Date() },
      select: { id: true },
    })

    // Remove internal fields from response
    const { shares: _shares, ...screenplayResponse } = screenplay
    // Clean up project.teamId from response (only needed for access check)
    if (screenplayResponse.project) {
      const { teamId: _teamId, ...projectData } = screenplayResponse.project
      screenplayResponse.project = projectData as typeof screenplayResponse.project
    }

    return NextResponse.json(screenplayResponse)
  } catch (error) {
    console.error("Error fetching screenplay:", error)
    return NextResponse.json(
      { error: "Failed to fetch screenplay" },
      { status: 500 }
    )
  }
}

// Validation schema for updating a screenplay
const updateScreenplaySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  synopsis: z.string().optional().nullable(),
  logline: z.string().optional().nullable(),
  genre: z.string().optional().nullable(),
  author: z.string().optional().nullable(),
  // Type and TV-specific fields
  type: z.enum(["FILM", "TV"]).optional(),
  season: z.number().int().positive().nullable().optional(),
  episode: z.number().int().positive().nullable().optional(),
  episodeTitle: z.string().max(255).nullable().optional(),
  // Title page fields
  contactName: z.string().max(255).nullable().optional(),
  contactEmail: z.string().email().max(255).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  contactAddress: z.string().max(500).nullable().optional(),
  copyrightYear: z.number().int().min(1900).max(2100).nullable().optional(),
  copyrightHolder: z.string().max(255).nullable().optional(),
  registrationNumber: z.string().max(100).nullable().optional(),
  draftLabel: z.string().max(100).nullable().optional(),
  draftDate: z.string().nullable().optional(), // ISO date string
  showTitlePageContact: z.boolean().optional(),
  showTitlePageCopyright: z.boolean().optional(),
  showTitlePageDraft: z.boolean().optional(),
  // For optimistic locking - client sends expected timestamp
  expectedUpdatedAt: z.number().optional(),
})

// Shared update logic for PUT and PATCH
async function updateScreenplay(
  request: NextRequest,
  params: Promise<{ id: string }>
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
    // Require EDITOR role for updates
    const access = await checkScreenplayAccess(id, session.user.id, 'EDITOR')

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = updateScreenplaySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const {
      title, content, synopsis, logline, genre, author, type, season, episode, episodeTitle,
      contactName, contactEmail, contactPhone, contactAddress,
      copyrightYear, copyrightHolder, registrationNumber,
      draftLabel, draftDate,
      showTitlePageContact, showTitlePageCopyright, showTitlePageDraft,
      expectedUpdatedAt
    } = result.data

    // Validate content size if provided
    if (content !== undefined) {
      const contentSize = new TextEncoder().encode(content).length
      const MAX_CONTENT_SIZE = 5 * 1024 * 1024
      if (contentSize > MAX_CONTENT_SIZE) {
        return NextResponse.json(
          { error: "Content too large. Maximum size is 5MB." },
          { status: 400 }
        )
      }
    }

    // Optimistic locking - check if screenplay was modified since client loaded it
    if (expectedUpdatedAt !== undefined) {
      const current = await prisma.screenplay.findUnique({
        where: { id },
        select: { updatedAt: true },
      })

      if (current && current.updatedAt.getTime() !== expectedUpdatedAt) {
        return NextResponse.json(
          {
            error: "Conflict: screenplay was modified by another user",
            currentUpdatedAt: current.updatedAt.getTime(),
          },
          { status: 409 }
        )
      }
    }

    // Compute wordCount if content is being updated
    const wordCount = content !== undefined
      ? content.split(/\s+/).filter(Boolean).length
      : undefined

    const screenplay = await prisma.screenplay.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(wordCount !== undefined && { wordCount }),
        ...(synopsis !== undefined && { synopsis }),
        ...(logline !== undefined && { logline }),
        ...(genre !== undefined && { genre }),
        ...(author !== undefined && { author }),
        ...(type !== undefined && { type }),
        ...(season !== undefined && { season }),
        ...(episode !== undefined && { episode }),
        ...(episodeTitle !== undefined && { episodeTitle }),
        // Title page fields
        ...(contactName !== undefined && { contactName }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(contactAddress !== undefined && { contactAddress }),
        ...(copyrightYear !== undefined && { copyrightYear }),
        ...(copyrightHolder !== undefined && { copyrightHolder }),
        ...(registrationNumber !== undefined && { registrationNumber }),
        ...(draftLabel !== undefined && { draftLabel }),
        ...(draftDate !== undefined && { draftDate: draftDate ? new Date(draftDate) : null }),
        ...(showTitlePageContact !== undefined && { showTitlePageContact }),
        ...(showTitlePageCopyright !== undefined && { showTitlePageCopyright }),
        ...(showTitlePageDraft !== undefined && { showTitlePageDraft }),
      },
    })

    return NextResponse.json(screenplay)
  } catch (error) {
    console.error("Error updating screenplay:", error)
    return NextResponse.json(
      { error: "Failed to update screenplay" },
      { status: 500 }
    )
  }
}

// PUT /api/screenplays/[id] - Update a screenplay
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateScreenplay(request, params)
}

// PATCH /api/screenplays/[id] - Partially update a screenplay
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateScreenplay(request, params)
}

// DELETE /api/screenplays/[id] - Delete a screenplay
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
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Only owner can delete (not shared users, even with ADMIN role)
    if (!access.isOwner) {
      return NextResponse.json(
        { error: "Only the owner can delete this screenplay" },
        { status: 403 }
      )
    }

    await prisma.screenplay.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting screenplay:", error)
    // Return more details in development
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        error: "Failed to delete screenplay",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
