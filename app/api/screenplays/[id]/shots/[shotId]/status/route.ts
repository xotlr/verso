import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canUseProduction, type PlanType } from "@/lib/stripe"
import { z } from "zod"
import { SHOT_STATUSES } from "@/types/shotlist"

// Validation schema for status update
const updateStatusSchema = z.object({
  status: z.enum(SHOT_STATUSES),
  takeCount: z.number().int().min(0).optional(),
  circledTake: z.number().int().min(1).optional().nullable(),
  quickNotes: z.string().optional().nullable(),
})

// Helper to check screenplay access
async function checkScreenplayAccess(screenplayId: string, userId: string) {
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    select: { userId: true, teamId: true },
  })

  if (!screenplay) return null

  // Check direct ownership
  if (screenplay.userId === userId) return screenplay

  // Check team membership
  if (screenplay.teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: screenplay.teamId,
          userId,
        },
      },
    })
    if (membership) return screenplay
  }

  return null
}

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

    // Check access
    const screenplay = await checkScreenplayAccess(screenplayId, session.user.id)
    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found or access denied" },
        { status: 404 }
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

    const { status, takeCount, circledTake, quickNotes } = validation.data

    // Update the shot
    const updatedShot = await prisma.shot.update({
      where: { id: shotId },
      data: {
        status,
        ...(takeCount !== undefined && { takeCount }),
        ...(circledTake !== undefined && { circledTake }),
        ...(quickNotes !== undefined && { quickNotes }),
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
