import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/screenplays/recent - Get recently opened screenplays
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 10)

    // Get user's team memberships
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    })
    const teamIds = teamMemberships.map((tm) => tm.teamId)

    // Get recently opened screenplays (owned by user OR in user's teams)
    const recentScreenplays = await prisma.screenplay.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { teamId: { in: teamIds } },
        ],
        lastOpenedAt: { not: null },
      },
      orderBy: { lastOpenedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        lastOpenedAt: true,
        isFavorite: true,
        project: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(recentScreenplays)
  } catch (error) {
    console.error("Error fetching recent screenplays:", error)
    return NextResponse.json(
      { error: "Failed to fetch recent screenplays" },
      { status: 500 }
    )
  }
}

// DELETE /api/screenplays/recent - Clear all recent history for user
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Clear lastOpenedAt for all user's screenplays
    await prisma.screenplay.updateMany({
      where: { userId: session.user.id },
      data: { lastOpenedAt: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error clearing recent history:", error)
    return NextResponse.json(
      { error: "Failed to clear recent history" },
      { status: 500 }
    )
  }
}
