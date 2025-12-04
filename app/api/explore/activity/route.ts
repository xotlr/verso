import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// GET /api/explore/activity - Get recent public activity (published screenplays, public projects)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const queryResult = activityQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      )
    }

    const { limit } = queryResult.data

    // Get recent activity from Activity table where type is screenplay_published
    // and the screenplay is still public
    const activities = await prisma.activity.findMany({
      where: {
        type: "screenplay_published",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        type: true,
        entityId: true,
        entityTitle: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    // Filter to only include activities where the screenplay is still public
    // and enrich with screenplay data
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        if (activity.type === "screenplay_published" && activity.entityId) {
          const screenplay = await prisma.screenplay.findUnique({
            where: { id: activity.entityId },
            select: {
              id: true,
              title: true,
              synopsis: true,
              genre: true,
              isPublic: true,
            },
          })

          // Only include if screenplay is still public
          if (screenplay?.isPublic) {
            return {
              ...activity,
              screenplay,
            }
          }
          return null
        }
        return activity
      })
    )

    // Filter out null entries (unpublished screenplays)
    const validActivities = enrichedActivities.filter(Boolean)

    return NextResponse.json({
      activities: validActivities,
    })
  } catch (error) {
    console.error("Error fetching public activity:", error)
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    )
  }
}
