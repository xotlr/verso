import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/activity - Get user's activity feed
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)
    const offset = parseInt(searchParams.get("offset") || "0")

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          entityId: true,
          entityTitle: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.activity.count({
        where: { userId: session.user.id },
      }),
    ])

    return NextResponse.json({
      activities,
      total,
      hasMore: offset + activities.length < total,
    })
  } catch (error) {
    console.error("Error fetching activity:", error)
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    )
  }
}
