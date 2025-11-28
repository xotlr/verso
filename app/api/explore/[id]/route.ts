import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/explore/[id] - Get a public screenplay and increment views
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the screenplay if it's public
    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id,
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        content: true,
        synopsis: true,
        genre: true,
        views: true,
        publishedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
          },
        },
      },
    })

    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found or not public" },
        { status: 404 }
      )
    }

    // Increment view count (fire and forget)
    prisma.screenplay.update({
      where: { id },
      data: { views: { increment: 1 } },
    }).catch(console.error)

    return NextResponse.json(screenplay)
  } catch (error) {
    console.error("Error fetching public screenplay:", error)
    return NextResponse.json(
      { error: "Failed to fetch screenplay" },
      { status: 500 }
    )
  }
}
