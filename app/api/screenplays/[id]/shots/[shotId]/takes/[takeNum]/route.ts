import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { canUseProduction, type PlanType } from "@/lib/stripe"
import { z } from "zod"

// Validation schema for take note
const takeNoteSchema = z.object({
  rating: z.enum(["good", "bad", "circle", "print"]).optional().nullable(),
  notes: z.string().optional().nullable(),
  timecode: z.string().optional().nullable(),
})

// PUT /api/screenplays/[id]/shots/[shotId]/takes/[takeNum] - Create/update take note
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; shotId: string; takeNum: string }> }
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

    const { id: screenplayId, shotId, takeNum: takeNumStr } = await params
    const takeNum = parseInt(takeNumStr, 10)

    if (isNaN(takeNum) || takeNum < 1) {
      return NextResponse.json(
        { error: "Invalid take number" },
        { status: 400 }
      )
    }

    // Check access - require EDITOR role for take notes
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

    // Validate take number against shot's takeCount
    if (takeNum > existingShot.takeCount) {
      return NextResponse.json(
        { error: "Take number exceeds shot take count" },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = takeNoteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { rating, notes, timecode } = validation.data

    // Upsert the take note
    const takeNote = await prisma.takeNote.upsert({
      where: {
        shotId_takeNum: {
          shotId,
          takeNum,
        },
      },
      update: {
        rating,
        notes,
        timecode,
      },
      create: {
        shotId,
        takeNum,
        rating,
        notes,
        timecode,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({ takeNote })
  } catch (error) {
    console.error("Error updating take note:", error)
    return NextResponse.json(
      { error: "Failed to update take note" },
      { status: 500 }
    )
  }
}

// GET /api/screenplays/[id]/shots/[shotId]/takes/[takeNum] - Get take note
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; shotId: string; takeNum: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: screenplayId, shotId, takeNum: takeNumStr } = await params
    const takeNum = parseInt(takeNumStr, 10)

    if (isNaN(takeNum) || takeNum < 1) {
      return NextResponse.json(
        { error: "Invalid take number" },
        { status: 400 }
      )
    }

    // Check access
    const screenplay = await checkScreenplayAccess(screenplayId, session.user.id)
    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found or access denied" },
        { status: 404 }
      )
    }

    const takeNote = await prisma.takeNote.findUnique({
      where: {
        shotId_takeNum: {
          shotId,
          takeNum,
        },
      },
    })

    return NextResponse.json({ takeNote })
  } catch (error) {
    console.error("Error fetching take note:", error)
    return NextResponse.json(
      { error: "Failed to fetch take note" },
      { status: 500 }
    )
  }
}
