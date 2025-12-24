import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Helper to check callsheet access
async function checkCallsheetAccess(callsheetId: string, userId: string) {
  const callsheet = await prisma.callsheet.findUnique({
    where: { id: callsheetId },
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

  if (!callsheet) {
    return { allowed: false, error: "Callsheet not found", status: 404 }
  }

  if (callsheet.userId === userId) {
    return { allowed: true, callsheet }
  }

  if (callsheet.project?.team && callsheet.project.team.members.length > 0) {
    return { allowed: true, callsheet }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

// GET /api/callsheets/[id]/checkin - List all check-ins
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
    const access = await checkCallsheetAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const checkIns = await prisma.crewCheckIn.findMany({
      where: { callsheetId: id },
      orderBy: { checkedInAt: "desc" },
    })

    return NextResponse.json({ checkIns })
  } catch (error) {
    console.error("Error fetching check-ins:", error)
    return NextResponse.json(
      { error: "Failed to fetch check-ins" },
      { status: 500 }
    )
  }
}

const checkInSchema = z.object({
  crewName: z.string().min(1).max(255),
  department: z.string().min(1).max(100),
  notes: z.string().max(500).optional().nullable(),
})

// POST /api/callsheets/[id]/checkin - Check in a crew member
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

    const { id } = await params
    const access = await checkCallsheetAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = checkInSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { crewName, department, notes } = result.data

    // Check if this is a new check-in
    const existingCheckIn = await prisma.crewCheckIn.findUnique({
      where: {
        callsheetId_crewName: {
          callsheetId: id,
          crewName,
        },
      },
    })
    const isNewCheckIn = !existingCheckIn

    // Upsert to handle re-check-ins
    const checkIn = await prisma.crewCheckIn.upsert({
      where: {
        callsheetId_crewName: {
          callsheetId: id,
          crewName,
        },
      },
      update: {
        checkedInAt: new Date(),
        checkedInBy: session.user.id,
        notes,
      },
      create: {
        callsheetId: id,
        crewName,
        department,
        checkedInBy: session.user.id,
        notes,
      },
    })

    // Notify project owner on new check-ins
    if (isNewCheckIn && access.callsheet) {
      const callsheetOwnerId = access.callsheet.userId
      if (callsheetOwnerId !== session.user.id) {
        await prisma.notification.create({
          data: {
            userId: callsheetOwnerId,
            type: "checkin",
            title: `${crewName} checked in`,
            body: `${department}`,
            data: {
              callsheetId: id,
              crewName,
              department,
            },
          },
        })
      }
    }

    return NextResponse.json({ checkIn })
  } catch (error) {
    console.error("Error checking in crew:", error)
    return NextResponse.json(
      { error: "Failed to check in crew member" },
      { status: 500 }
    )
  }
}

// DELETE /api/callsheets/[id]/checkin - Remove a check-in
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
    const access = await checkCallsheetAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const crewName = searchParams.get("crewName")

    if (!crewName) {
      return NextResponse.json(
        { error: "crewName query parameter required" },
        { status: 400 }
      )
    }

    await prisma.crewCheckIn.delete({
      where: {
        callsheetId_crewName: {
          callsheetId: id,
          crewName,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing check-in:", error)
    return NextResponse.json(
      { error: "Failed to remove check-in" },
      { status: 500 }
    )
  }
}
