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

  if (screenplay.userId === userId) {
    return { allowed: true, screenplay }
  }

  const teamId = screenplay.teamId || screenplay.project?.teamId
  if (teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    })

    if (membership) {
      return { allowed: true, screenplay }
    }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

// GET /api/screenplays/[id]/scenes/[sceneId]/meta - Get scene metadata
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id, sceneId } = await params
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const sceneMeta = await prisma.sceneMeta.findUnique({
      where: {
        screenplayId_sceneId: {
          screenplayId: id,
          sceneId,
        },
      },
    })

    // Return empty object if no metadata exists yet
    return NextResponse.json(sceneMeta || { sceneId, color: null, notes: null, mood: null })
  } catch (error) {
    console.error("Error fetching scene meta:", error)
    return NextResponse.json(
      { error: "Failed to fetch scene metadata" },
      { status: 500 }
    )
  }
}

// Validation schema for scene metadata
const sceneMetaSchema = z.object({
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  notes: z.string().nullable().optional(),
  mood: z.string().nullable().optional(),
})

// PUT /api/screenplays/[id]/scenes/[sceneId]/meta - Update scene metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id, sceneId } = await params
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = sceneMetaSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { color, notes, mood } = result.data

    const sceneMeta = await prisma.sceneMeta.upsert({
      where: {
        screenplayId_sceneId: {
          screenplayId: id,
          sceneId,
        },
      },
      update: {
        ...(color !== undefined && { color }),
        ...(notes !== undefined && { notes }),
        ...(mood !== undefined && { mood }),
      },
      create: {
        screenplayId: id,
        sceneId,
        color: color || null,
        notes: notes || null,
        mood: mood || null,
      },
    })

    return NextResponse.json(sceneMeta)
  } catch (error) {
    console.error("Error updating scene meta:", error)
    return NextResponse.json(
      { error: "Failed to update scene metadata" },
      { status: 500 }
    )
  }
}
