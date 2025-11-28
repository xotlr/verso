import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const publishSchema = z.object({
  isPublic: z.boolean(),
  genre: z.string().optional().nullable(),
})

// POST /api/screenplays/[id]/publish - Publish or unpublish a screenplay
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

    const body = await request.json()
    const result = publishSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { isPublic, genre } = result.data

    // Update screenplay
    const updated = await prisma.screenplay.update({
      where: { id },
      data: {
        isPublic,
        genre: genre || null,
        publishedAt: isPublic ? (screenplay.publishedAt || new Date()) : null,
      },
      select: {
        id: true,
        isPublic: true,
        genre: true,
        publishedAt: true,
        views: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error publishing screenplay:", error)
    return NextResponse.json(
      { error: "Failed to publish screenplay" },
      { status: 500 }
    )
  }
}

// GET /api/screenplays/[id]/publish - Get publish status
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

    // Check if user owns the screenplay
    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        isPublic: true,
        genre: true,
        publishedAt: true,
        views: true,
      },
    })

    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(screenplay)
  } catch (error) {
    console.error("Error getting publish status:", error)
    return NextResponse.json(
      { error: "Failed to get publish status" },
      { status: 500 }
    )
  }
}
