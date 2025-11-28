import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Helper to check note access
async function checkNoteAccess(noteId: string, userId: string) {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: {
      project: {
        include: {
          team: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      },
    },
  })

  if (!note) {
    return { allowed: false, error: "Note not found", status: 404 }
  }

  if (note.userId === userId) {
    return { allowed: true, note }
  }

  if (note.project?.team && note.project.team.members.length > 0) {
    return { allowed: true, note }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

// GET /api/notes/[id]
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
    const access = await checkNoteAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    return NextResponse.json(access.note)
  } catch (error) {
    console.error("Error fetching note:", error)
    return NextResponse.json(
      { error: "Failed to fetch note" },
      { status: 500 }
    )
  }
}

const updateNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  category: z.string().optional().nullable(),
})

// PUT /api/notes/[id]
export async function PUT(
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
    const access = await checkNoteAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = updateNoteSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const note = await prisma.note.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error("Error updating note:", error)
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    )
  }
}

// DELETE /api/notes/[id]
export async function DELETE(
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
    const access = await checkNoteAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    await prisma.note.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting note:", error)
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    )
  }
}
