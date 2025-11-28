import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Helper to check project access
async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  })

  if (!project) return false
  if (project.userId === userId) return true
  if (project.team && project.team.members.length > 0) return true

  return false
}

// GET /api/projects/[id]/schedules
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

    const { id: projectId } = await params

    const hasAccess = await hasProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const schedules = await prisma.schedule.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(schedules)
  } catch (error) {
    console.error("Error fetching schedules:", error)
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    )
  }
}

const createScheduleSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  data: z.any().optional(),
})

// POST /api/projects/[id]/schedules
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

    const { id: projectId } = await params

    const hasAccess = await hasProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = createScheduleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title, startDate, endDate, data } = result.data

    const schedule = await prisma.schedule.create({
      data: {
        title,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        data,
        userId: session.user.id,
        projectId,
      },
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    console.error("Error creating schedule:", error)
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    )
  }
}
