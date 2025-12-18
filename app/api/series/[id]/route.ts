import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// GET /api/series/[id] - Get a single series with episodes
export async function GET(
  request: Request,
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

    const series = await prisma.series.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        logline: true,
        genre: true,
        format: true,
        banner: true,
        createdAt: true,
        updatedAt: true,
        projectId: true,
        project: {
          select: { id: true, name: true },
        },
        // New: Include seasons with nested episodes
        seasons: {
          select: {
            id: true,
            number: true,
            title: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            episodes: {
              select: {
                id: true,
                title: true,
                episode: true,
                episodeTitle: true,
                wordCount: true,
                updatedAt: true,
                isFavorite: true,
              },
              orderBy: { episode: "asc" },
            },
            _count: {
              select: { episodes: true },
            },
          },
          orderBy: { number: "asc" },
        },
        // Legacy: Direct episodes (for backward compatibility)
        episodes: {
          select: {
            id: true,
            title: true,
            season: true,
            episode: true,
            episodeTitle: true,
            wordCount: true,
            updatedAt: true,
            isFavorite: true,
          },
          orderBy: [
            { season: "asc" },
            { episode: "asc" },
          ],
        },
        _count: {
          select: { episodes: true, seasons: true },
        },
      },
    })

    if (!series) {
      return NextResponse.json(
        { error: "Series not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(series)
  } catch (error) {
    console.error("Error fetching series:", error)
    return NextResponse.json(
      { error: "Failed to fetch series" },
      { status: 500 }
    )
  }
}

// Validation schema for updating a series
const updateSeriesSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  logline: z.string().optional().nullable(),
  genre: z.string().optional().nullable(),
  format: z.enum(["one-hour", "half-hour", "multi-cam", "limited", "anthology"]).optional().nullable(),
  projectId: z.string().optional().nullable(),
  banner: z.string().url().optional().nullable(),
})

// PATCH /api/series/[id] - Update a series
export async function PATCH(
  request: Request,
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
    const body = await request.json()
    const result = updateSeriesSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    // Verify ownership
    const existingSeries = await prisma.series.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingSeries) {
      return NextResponse.json(
        { error: "Series not found" },
        { status: 404 }
      )
    }

    // If projectId provided, verify user owns the project
    if (result.data.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: result.data.projectId,
          userId: session.user.id,
        },
      })

      if (!project) {
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 403 }
        )
      }
    }

    const series = await prisma.series.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json(series)
  } catch (error) {
    console.error("Error updating series:", error)
    return NextResponse.json(
      { error: "Failed to update series" },
      { status: 500 }
    )
  }
}

// DELETE /api/series/[id] - Delete a series
export async function DELETE(
  request: Request,
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

    // Verify ownership
    const series = await prisma.series.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        _count: { select: { episodes: true } },
      },
    })

    if (!series) {
      return NextResponse.json(
        { error: "Series not found" },
        { status: 404 }
      )
    }

    // Unlink episodes from series (don't delete them)
    await prisma.screenplay.updateMany({
      where: { seriesId: id },
      data: { seriesId: null },
    })

    // Delete the series
    await prisma.series.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting series:", error)
    return NextResponse.json(
      { error: "Failed to delete series" },
      { status: 500 }
    )
  }
}
