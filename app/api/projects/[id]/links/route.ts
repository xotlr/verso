import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper to check project access
async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  })

  if (!project) return false
  if (project.userId === userId) return true
  if (project.team && project.team.members.length > 0) return true

  return false
}

// GET /api/projects/[id]/links - List all external links for a project
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: projectId } = await params

    const hasAccess = await hasProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const links = await prisma.externalLink.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(links)
  } catch (error) {
    console.error("Error fetching links:", error)
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    )
  }
}

// Validation schema for creating a link
const createLinkSchema = z.object({
  url: z.string().url("Invalid URL"),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  favicon: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  siteName: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
})

// POST /api/projects/[id]/links - Create a new external link
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: projectId } = await params
    const body = await request.json()
    const result = createLinkSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const hasAccess = await hasProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const link = await prisma.externalLink.create({
      data: {
        ...result.data,
        userId: session.user.id,
        projectId,
      },
    })

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    console.error("Error creating link:", error)
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 }
    )
  }
}
