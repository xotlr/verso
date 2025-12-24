import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { canUseProduction, type PlanType } from "@/lib/stripe"
import { z } from "zod"
import { SHOT_STATUSES } from "@/types/shotlist"

// Validation schema for status update
const updateStatusSchema = z.object({
  status: z.enum(SHOT_STATUSES),
  takeCount: z.number().int().min(0).optional(),
  circledTake: z.number().int().min(1).optional().nullable(),
  quickNotes: z.string().optional().nullable(),
  // Script supervisor fields
  supervisorNotes: z.string().optional().nullable(),
  lineReading: z.string().optional().nullable(),
  continuityNotes: z.string().optional().nullable(),
  isFlagged: z.boolean().optional(),
})

// PATCH /api/screenplays/[id]/shots/[shotId]/status - Quick status update
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; shotId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Check plan access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    })
    const plan = (user?.plan as PlanType) || "FREE"

    if (!canUseProduction(plan)) {
      return NextResponse.json(
        { error: "Production features require PRO plan", upgradeRequired: true },
        { status: 403 }
      )
    }

    const { id: screenplayId, shotId } = await params

    // Check access - require EDITOR role for status updates
    const access = await checkScreenplayAccess(screenplayId, session.user.id, 'EDITOR')
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Verify shot exists and belongs to this screenplay
    const existingShot = await prisma.shot.findFirst({
      where: {
        id: shotId,
        screenplayId,
      },
    })

    if (!existingShot) {
      return NextResponse.json(
        { error: "Shot not found" },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = updateStatusSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const {
      status,
      takeCount,
      circledTake,
      quickNotes,
      supervisorNotes,
      lineReading,
      continuityNotes,
      isFlagged,
    } = validation.data

    // Update the shot
    const updatedShot = await prisma.shot.update({
      where: { id: shotId },
      data: {
        status,
        ...(takeCount !== undefined && { takeCount }),
        ...(circledTake !== undefined && { circledTake }),
        ...(quickNotes !== undefined && { quickNotes }),
        ...(supervisorNotes !== undefined && { supervisorNotes }),
        ...(lineReading !== undefined && { lineReading }),
        ...(continuityNotes !== undefined && { continuityNotes }),
        ...(isFlagged !== undefined && { isFlagged }),
        statusChangedAt: new Date(),
        statusChangedBy: session.user.id,
      },
    })

    return NextResponse.json({ shot: updatedShot })
  } catch (error) {
    console.error("Error updating shot status:", error)
    return NextResponse.json(
      { error: "Failed to update shot status" },
      { status: 500 }
    )
  }
}
