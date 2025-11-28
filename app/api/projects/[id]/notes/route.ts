import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

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

// GET /api/projects/[id]/notes - List notes for a project
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

    const { id: projectId } = await params

    const hasAccess = await hasProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const notes = await prisma.note.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error("Error fetching notes:", error)
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    )
  }
}

const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().default(""),
  category: z.string().optional(),
})

// POST /api/projects/[id]/notes - Create a note
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

    const { id: projectId } = await params

    const hasAccess = await hasProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = createNoteSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const note = await prisma.note.create({
      data: {
        ...result.data,
        userId: session.user.id,
        projectId,
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error("Error creating note:", error)
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    )
  }
}
