import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/screenplays/favorites - Get favorite screenplays
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20)

    // Get user's favorite screenplays (only user-owned can be favorited)
    const favorites = await prisma.screenplay.findMany({
      where: {
        userId: session.user.id,
        isFavorite: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        isFavorite: true,
        project: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(favorites)
  } catch (error) {
    console.error("Error fetching favorites:", error)
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    )
  }
}
