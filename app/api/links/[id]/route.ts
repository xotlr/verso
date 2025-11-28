import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper to check link access (owner or team member of project)
async function hasLinkAccess(linkId: string, userId: string): Promise<boolean> {
  const link = await prisma.externalLink.findUnique({
    where: { id: linkId },
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

  if (!link) return false
  if (link.userId === userId) return true
  if (link.project.userId === userId) return true
  if (link.project.team && link.project.team.members.length > 0) return true

  return false
}

// GET /api/links/[id] - Get a single link
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await params

    const hasAccess = await hasLinkAccess(id, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      )
    }

    const link = await prisma.externalLink.findUnique({
      where: { id },
    })

    return NextResponse.json(link)
  } catch (error) {
    console.error("Error fetching link:", error)
    return NextResponse.json(
      { error: "Failed to fetch link" },
      { status: 500 }
    )
  }
}

// Validation schema for updating a link
const updateLinkSchema = z.object({
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
})

// PATCH /api/links/[id] - Update a link
export async function PATCH(request: Request, { params }: RouteParams) {
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
    const result = updateLinkSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const hasAccess = await hasLinkAccess(id, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      )
    }

    const link = await prisma.externalLink.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json(link)
  } catch (error) {
    console.error("Error updating link:", error)
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500 }
    )
  }
}

// DELETE /api/links/[id] - Delete a link
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await params

    const hasAccess = await hasLinkAccess(id, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      )
    }

    await prisma.externalLink.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting link:", error)
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 }
    )
  }
}
