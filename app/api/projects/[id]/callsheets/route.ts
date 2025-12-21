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

// GET /api/projects/[id]/callsheets
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

    const callsheets = await prisma.callsheet.findMany({
      where: { projectId },
      orderBy: { shootDate: "asc" },
      select: {
        id: true,
        title: true,
        shootDate: true,
        callTime: true,
        wrapTime: true,
        status: true,
        primaryLocation: true,
        weatherForecast: true,
        weatherTemp: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(callsheets)
  } catch (error) {
    console.error("Error fetching callsheets:", error)
    return NextResponse.json(
      { error: "Failed to fetch callsheets" },
      { status: 500 }
    )
  }
}

const createCallsheetSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  shootDate: z.string().datetime(),
  callTime: z.string().datetime(),
  wrapTime: z.string().datetime().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED"]).optional(),
  primaryLocation: z.string().max(255).optional().nullable(),
  data: z.any().optional(),
  weatherForecast: z.string().max(255).optional().nullable(),
  weatherTemp: z.number().optional().nullable(),
})

// POST /api/projects/[id]/callsheets
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
    const result = createCallsheetSchema.safeParse(body)

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

    const callsheet = await prisma.callsheet.create({
      data: {
        title,
        shootDate: new Date(shootDate),
        callTime: new Date(callTime),
        wrapTime: wrapTime ? new Date(wrapTime) : null,
        status: status || "DRAFT",
        primaryLocation,
        data,
        weatherForecast,
        weatherTemp,
        userId: session.user.id,
        projectId,
      },
    })

    return NextResponse.json(callsheet, { status: 201 })
  } catch (error) {
    console.error("Error creating callsheet:", error)
    return NextResponse.json(
      { error: "Failed to create callsheet" },
      { status: 500 }
    )
  }
}
