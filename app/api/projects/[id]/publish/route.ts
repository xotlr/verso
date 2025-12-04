import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const publishSchema = z.object({
  isPublic: z.boolean(),
})

// POST /api/projects/[id]/publish - Publish or unpublish a project
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

    // Check if user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
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

    const { isPublic } = result.data

    // Update project
    const updated = await prisma.project.update({
      where: { id },
      data: {
        isPublic,
        publishedAt: isPublic ? (project.publishedAt || new Date()) : null,
      },
      select: {
        id: true,
        isPublic: true,
        publishedAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error publishing project:", error)
    return NextResponse.json(
      { error: "Failed to publish project" },
      { status: 500 }
    )
  }
}

// GET /api/projects/[id]/publish - Get publish status
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

    // Check if user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        isPublic: true,
        publishedAt: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error getting publish status:", error)
    return NextResponse.json(
      { error: "Failed to get publish status" },
      { status: 500 }
    )
  }
}
