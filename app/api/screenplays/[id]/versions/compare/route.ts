import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

// GET /api/screenplays/[id]/versions/compare?from=versionId&to=versionId
// Compare two versions
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
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const fromId = searchParams.get("from")
    const toId = searchParams.get("to")

    if (!fromId || !toId) {
      return NextResponse.json(
        { error: "Both 'from' and 'to' version IDs are required" },
        { status: 400 }
      )
    }

    // Fetch both versions
    const [fromVersion, toVersion] = await Promise.all([
      prisma.screenplayVersion.findUnique({
        where: { id: fromId },
        include: {
          creator: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
      prisma.screenplayVersion.findUnique({
        where: { id: toId },
        include: {
          creator: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
    ])

    if (!fromVersion) {
      return NextResponse.json(
        { error: "'from' version not found" },
        { status: 404 }
      )
    }

    if (!toVersion) {
      return NextResponse.json(
        { error: "'to' version not found" },
        { status: 404 }
      )
    }

    // Verify both versions belong to this screenplay
    if (fromVersion.screenplayId !== id || toVersion.screenplayId !== id) {
      return NextResponse.json(
        { error: "Versions do not belong to this screenplay" },
        { status: 400 }
      )
    }

    // Calculate diff stats
    const wordsAdded = Math.max(0, toVersion.wordCount - fromVersion.wordCount)
    const wordsRemoved = Math.max(0, fromVersion.wordCount - toVersion.wordCount)
    const scenesAdded = Math.max(0, toVersion.sceneCount - fromVersion.sceneCount)
    const scenesRemoved = Math.max(0, fromVersion.sceneCount - toVersion.sceneCount)

    return NextResponse.json({
      from: fromVersion,
      to: toVersion,
      diffStats: {
        wordsAdded,
        wordsRemoved,
        scenesAdded,
        scenesRemoved,
      },
    })
  } catch (error) {
    console.error("Error comparing versions:", error)
    return NextResponse.json(
      { error: "Failed to compare versions" },
      { status: 500 }
    )
  }
}
