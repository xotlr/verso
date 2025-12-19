import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/shared-with-me - Get all items shared with the current user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get screenplays shared with user
    const screenplays = await prisma.screenplayShare.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        role: true,
        createdAt: true,
        sharer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        screenplay: {
          select: {
            id: true,
            title: true,
            logline: true,
            genre: true,
            updatedAt: true,
            type: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Get projects shared with user
    const projects = await prisma.projectShare.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        role: true,
        createdAt: true,
        sharer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            status: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            _count: {
              select: {
                screenplays: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Get series shared with user
    const series = await prisma.seriesShare.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        role: true,
        createdAt: true,
        sharer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        series: {
          select: {
            id: true,
            title: true,
            logline: true,
            genre: true,
            format: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            _count: {
              select: {
                seasons: true,
                episodes: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      screenplays: screenplays.map((s) => ({
        ...s.screenplay,
        shareId: s.id,
        shareRole: s.role,
        sharedAt: s.createdAt,
        sharedBy: s.sharer,
        type: "screenplay" as const,
      })),
      projects: projects.map((p) => ({
        ...p.project,
        shareId: p.id,
        shareRole: p.role,
        sharedAt: p.createdAt,
        sharedBy: p.sharer,
        type: "project" as const,
      })),
      series: series.map((s) => ({
        ...s.series,
        shareId: s.id,
        shareRole: s.role,
        sharedAt: s.createdAt,
        sharedBy: s.sharer,
        type: "series" as const,
      })),
    })
  } catch (error) {
    console.error("Error fetching shared items:", error)
    return NextResponse.json(
      { error: "Failed to fetch shared items" },
      { status: 500 }
    )
  }
}
