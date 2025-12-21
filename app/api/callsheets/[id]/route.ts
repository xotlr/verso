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

// GET /api/callsheets/[id]
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

    // Fetch with project name for display
    const callsheet = await prisma.callsheet.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(callsheet)
  } catch (error) {
    console.error("Error fetching callsheet:", error)
    return NextResponse.json(
      { error: "Failed to fetch callsheet" },
      { status: 500 }
    )
  }
}

const updateCallsheetSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  shootDate: z.string().datetime().optional(),
  callTime: z.string().datetime().optional(),
  wrapTime: z.string().datetime().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED"]).optional(),
  primaryLocation: z.string().max(255).optional().nullable(),
  data: z.any().optional(),
  weatherForecast: z.string().max(255).optional().nullable(),
  weatherTemp: z.number().optional().nullable(),
})

// PUT /api/callsheets/[id]
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
    const access = await checkCallsheetAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = updateCallsheetSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const {
      title,
      shootDate,
      callTime,
      wrapTime,
      status,
      primaryLocation,
      data,
      weatherForecast,
      weatherTemp,
    } = result.data

    const callsheet = await prisma.callsheet.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(shootDate !== undefined && { shootDate: new Date(shootDate) }),
        ...(callTime !== undefined && { callTime: new Date(callTime) }),
        ...(wrapTime !== undefined && { wrapTime: wrapTime ? new Date(wrapTime) : null }),
        ...(status !== undefined && { status }),
        ...(primaryLocation !== undefined && { primaryLocation }),
        ...(data !== undefined && { data }),
        ...(weatherForecast !== undefined && { weatherForecast }),
        ...(weatherTemp !== undefined && { weatherTemp }),
      },
    })

    return NextResponse.json(callsheet)
  } catch (error) {
    console.error("Error updating callsheet:", error)
    return NextResponse.json(
      { error: "Failed to update callsheet" },
      { status: 500 }
    )
  }
}

// DELETE /api/callsheets/[id]
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

    await prisma.callsheet.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting callsheet:", error)
    return NextResponse.json(
      { error: "Failed to delete callsheet" },
      { status: 500 }
    )
  }
}
