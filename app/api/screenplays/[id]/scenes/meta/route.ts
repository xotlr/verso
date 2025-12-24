import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"

// GET /api/screenplays/[id]/scenes/meta - Get all scene metadata for a screenplay
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

    const sceneMetas = await prisma.sceneMeta.findMany({
      where: { screenplayId: id },
    })

    // Return as a map keyed by sceneId for easy lookup
    const metaMap: Record<string, {
      color: string | null
      notes: string | null
      mood: string | null
      act: string | null
    }> = {}

    for (const meta of sceneMetas) {
      metaMap[meta.sceneId] = {
        color: meta.color,
        notes: meta.notes,
        mood: meta.mood,
        act: meta.act,
      }
    }

    return NextResponse.json(metaMap)
  } catch (error) {
    console.error("Error fetching scene metas:", error)
    return NextResponse.json(
      { error: "Failed to fetch scene metadata" },
      { status: 500 }
    )
  }
}
