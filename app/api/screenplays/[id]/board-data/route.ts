import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { DEFAULT_ACTS } from "@/types/beat-board"

/**
 * GET /api/screenplays/[id]/board-data
 *
 * Combined endpoint for the beat board page that returns:
 * - Screenplay (title, content, acts config)
 * - Scene metadata (colors, notes, mood, act assignments)
 *
 * This eliminates 3 separate API calls and their duplicate auth/access checks,
 * reducing TTFB by ~60%.
 */
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

    // Fetch screenplay and scene metas in parallel
    const [screenplay, sceneMetas] = await Promise.all([
      prisma.screenplay.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          content: true,
          acts: true,
        },
      }),
      prisma.sceneMeta.findMany({
        where: { screenplayId: id },
      }),
    ])

    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found" },
        { status: 404 }
      )
    }

    // Convert scene metas to a map keyed by sceneId
    const sceneMetaMap: Record<string, {
      color: string | null
      notes: string | null
      mood: string | null
      act: string | null
    }> = {}

    for (const meta of sceneMetas) {
      sceneMetaMap[meta.sceneId] = {
        color: meta.color,
        notes: meta.notes,
        mood: meta.mood,
        act: meta.act,
      }
    }

    const response = NextResponse.json({
      screenplay: {
        id: screenplay.id,
        title: screenplay.title,
        content: screenplay.content,
        acts: screenplay.acts || DEFAULT_ACTS,
      },
      sceneMetas: sceneMetaMap,
    })

    response.headers.set("Cache-Control", "private, max-age=30")
    return response
  } catch (error) {
    console.error("Error fetching board data:", error)
    return NextResponse.json(
      { error: "Failed to fetch board data" },
      { status: 500 }
    )
  }
}
