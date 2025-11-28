import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Helper to check screenplay access
async function checkScreenplayAccess(screenplayId: string, userId: string) {
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    include: {
      project: { select: { teamId: true } },
      team: { select: { id: true } },
    },
  })

  if (!screenplay) {
    return { allowed: false, error: "Screenplay not found", status: 404 }
  }

  if (screenplay.userId === userId) {
    return { allowed: true, screenplay }
  }

  const teamId = screenplay.teamId || screenplay.project?.teamId
  if (teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    })

    if (membership) {
      return { allowed: true, screenplay }
    }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

// Validation schema for updating attachment
const updateAttachmentSchema = z.object({
  caption: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
})

// PATCH /api/screenplays/[id]/attachments/[attachmentId] - Update attachment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id, attachmentId } = await params
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Verify attachment belongs to screenplay
    const attachment = await prisma.sceneAttachment.findUnique({
      where: { id: attachmentId },
    })

    if (!attachment || attachment.screenplayId !== id) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = updateAttachmentSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { caption, displayOrder } = result.data

    const updated = await prisma.sceneAttachment.update({
      where: { id: attachmentId },
      data: {
        ...(caption !== undefined && { caption }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating attachment:", error)
    return NextResponse.json(
      { error: "Failed to update attachment" },
      { status: 500 }
    )
  }
}

// DELETE /api/screenplays/[id]/attachments/[attachmentId] - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id, attachmentId } = await params
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Verify attachment belongs to screenplay
    const attachment = await prisma.sceneAttachment.findUnique({
      where: { id: attachmentId },
    })

    if (!attachment || attachment.screenplayId !== id) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      )
    }

    await prisma.sceneAttachment.delete({
      where: { id: attachmentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting attachment:", error)
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    )
  }
}
