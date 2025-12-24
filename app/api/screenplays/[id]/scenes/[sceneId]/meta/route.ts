import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { z } from "zod"

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
    return NextResponse.json(sceneMeta || { sceneId, color: null, notes: null, mood: null, act: null })
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
  act: z.string().nullable().optional(), // Dynamic act ID (any string)
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

    const { color, notes, mood, act } = result.data

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
        ...(act !== undefined && { act }),
      },
      create: {
        screenplayId: id,
        sceneId,
        color: color || null,
        notes: notes || null,
        mood: mood || null,
        act: act || null,
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
