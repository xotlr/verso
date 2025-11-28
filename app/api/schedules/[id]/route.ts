import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Helper to check schedule access
async function checkScheduleAccess(scheduleId: string, userId: string) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
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

  if (!schedule) {
    return { allowed: false, error: "Schedule not found", status: 404 }
  }

  if (schedule.userId === userId) {
    return { allowed: true, schedule }
  }

  if (schedule.project?.team && schedule.project.team.members.length > 0) {
    return { allowed: true, schedule }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

// GET /api/schedules/[id]
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
    const access = await checkScheduleAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    return NextResponse.json(access.schedule)
  } catch (error) {
    console.error("Error fetching schedule:", error)
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    )
  }
}

const updateScheduleSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  data: z.any().optional(),
})

// PUT /api/schedules/[id]
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
    const access = await checkScheduleAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = updateScheduleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title, startDate, endDate, data } = result.data

    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(data !== undefined && { data }),
      },
    })

    return NextResponse.json(schedule)
  } catch (error) {
    console.error("Error updating schedule:", error)
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    )
  }
}

// DELETE /api/schedules/[id]
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
    const access = await checkScheduleAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    await prisma.schedule.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    )
  }
}
