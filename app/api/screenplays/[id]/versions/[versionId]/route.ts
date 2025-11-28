import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Helper to check screenplay access
async function checkScreenplayAccess(screenplayId: string, userId: string) {
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    include: {
      project: { select: { teamId: true } },
      team: { select: { id: true } },
    },
  })

  if (!screenplay) {
    return { allowed: false, error: "Screenplay not found", status: 404 }
  }

  // Check if user owns it directly
  if (screenplay.userId === userId) {
    return { allowed: true, screenplay }
  }

  // Check team access
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

  return { allowed: false, error: "Access denied", status: 403 }
}

// GET /api/screenplays/[id]/versions/[versionId] - Get a single version
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id, versionId } = await params
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const version = await prisma.screenplayVersion.findUnique({
      where: { id: versionId },
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
      },
    })

    if (!version || version.screenplayId !== id) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(version)
  } catch (error) {
    console.error("Error fetching version:", error)
    return NextResponse.json(
      { error: "Failed to fetch version" },
      { status: 500 }
    )
  }
}

// Validation schema for updating a version (label only)
const updateVersionSchema = z.object({
  label: z.string().nullable(),
})

// PATCH /api/screenplays/[id]/versions/[versionId] - Update version label
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id, versionId } = await params
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = updateVersionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const version = await prisma.screenplayVersion.update({
      where: { id: versionId },
      data: { label: result.data.label },
    })

    return NextResponse.json(version)
  } catch (error) {
    console.error("Error updating version:", error)
    return NextResponse.json(
      { error: "Failed to update version" },
      { status: 500 }
    )
  }
}

// POST /api/screenplays/[id]/versions/[versionId] - Restore this version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id, versionId } = await params
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Get the version to restore
    const versionToRestore = await prisma.screenplayVersion.findUnique({
      where: { id: versionId },
    })

    if (!versionToRestore || versionToRestore.screenplayId !== id) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      )
    }

    // Get current screenplay content
    const screenplay = await prisma.screenplay.findUnique({
      where: { id },
    })

    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found" },
        { status: 404 }
      )
    }

    // Get the next version number
    const lastVersion = await prisma.screenplayVersion.findFirst({
      where: { screenplayId: id },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    })

    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1

    // Calculate word count and scene count for current content
    const currentWordCount = screenplay.content.split(/\s+/).filter(Boolean).length
    const currentSceneCount = (screenplay.content.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/gim) || []).length

    // Create a backup version of current content before restoring
    await prisma.screenplayVersion.create({
      data: {
        screenplayId: id,
        content: screenplay.content,
        versionNumber,
        label: "Backup before restore",
        reason: "restore",
        wordCount: currentWordCount,
        sceneCount: currentSceneCount,
        createdBy: session.user.id,
      },
    })

    // Update screenplay with restored content
    const updatedScreenplay = await prisma.screenplay.update({
      where: { id },
      data: { content: versionToRestore.content },
    })

    return NextResponse.json({
      success: true,
      screenplay: updatedScreenplay,
      restoredFromVersion: versionToRestore.versionNumber,
    })
  } catch (error) {
    console.error("Error restoring version:", error)
    return NextResponse.json(
      { error: "Failed to restore version" },
      { status: 500 }
    )
  }
}

// DELETE /api/screenplays/[id]/versions/[versionId] - Delete a version
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id, versionId } = await params
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Verify the version belongs to this screenplay
    const version = await prisma.screenplayVersion.findUnique({
      where: { id: versionId },
    })

    if (!version || version.screenplayId !== id) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      )
    }

    await prisma.screenplayVersion.delete({
      where: { id: versionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting version:", error)
    return NextResponse.json(
      { error: "Failed to delete version" },
      { status: 500 }
    )
  }
}
