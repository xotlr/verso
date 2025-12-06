import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string; needId: string }>
}

// Helper to check if user owns the project
async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })
  return project?.userId === userId
}

// Validation schema for updating a role need
const updateRoleNeedSchema = z.object({
  role: z.string().min(1).optional(),
  description: z.string().max(1000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  isPaid: z.boolean().optional(),
})

// PATCH /api/projects/[id]/role-needs/[needId] - Update a role need
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: projectId, needId } = await params
    const body = await request.json()
    const result = updateRoleNeedSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    // Only project owner can update role needs
    const isOwner = await isProjectOwner(projectId, session.user.id)
    if (!isOwner) {
      return NextResponse.json(
        { error: "Only project owner can update role needs" },
        { status: 403 }
      )
    }

    // Verify the role need exists and belongs to this project
    const existingRoleNeed = await prisma.projectRoleNeed.findFirst({
      where: {
        id: needId,
        projectId,
      },
    })

    if (!existingRoleNeed) {
      return NextResponse.json(
        { error: "Role need not found" },
        { status: 404 }
      )
    }

    const roleNeed = await prisma.projectRoleNeed.update({
      where: { id: needId },
      data: result.data,
    })

    return NextResponse.json(roleNeed)
  } catch (error) {
    console.error("Error updating role need:", error)
    return NextResponse.json(
      { error: "Failed to update role need" },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]/role-needs/[needId] - Delete a role need
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: projectId, needId } = await params

    // Only project owner can delete role needs
    const isOwner = await isProjectOwner(projectId, session.user.id)
    if (!isOwner) {
      return NextResponse.json(
        { error: "Only project owner can delete role needs" },
        { status: 403 }
      )
    }

    // Verify the role need exists and belongs to this project
    const existingRoleNeed = await prisma.projectRoleNeed.findFirst({
      where: {
        id: needId,
        projectId,
      },
    })

    if (!existingRoleNeed) {
      return NextResponse.json(
        { error: "Role need not found" },
        { status: 404 }
      )
    }

    await prisma.projectRoleNeed.delete({
      where: { id: needId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting role need:", error)
    return NextResponse.json(
      { error: "Failed to delete role need" },
      { status: 500 }
    )
  }
}
