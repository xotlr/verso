import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/screenplays/[id]/favorite - Toggle favorite status
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

    // Check if user owns the screenplay
    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found or access denied" },
        { status: 404 }
      )
    }

    // Toggle favorite status
    const updated = await prisma.screenplay.update({
      where: { id },
      data: { isFavorite: !screenplay.isFavorite },
      select: {
        id: true,
        isFavorite: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error toggling favorite:", error)
    return NextResponse.json(
      { error: "Failed to toggle favorite" },
      { status: 500 }
    )
  }
}
