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

  // Check if user owns it directly
  if (screenplay.userId === userId) {
    return { allowed: true, screenplay }
  }

  // Check team access
  const teamId = screenplay.teamId || screenplay.project?.teamId
  if (teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    })

    if (membership) {
      return { allowed: true, screenplay }
    }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

// GET /api/screenplays/[id]/versions - List all versions
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
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const [versions, total] = await Promise.all([
      prisma.screenplayVersion.findMany({
        where: { screenplayId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          creator: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
      prisma.screenplayVersion.count({
        where: { screenplayId: id },
      }),
    ])

    return NextResponse.json({
      versions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching versions:", error)
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    )
  }
}

// Validation schema for creating a version
const createVersionSchema = z.object({
  content: z.string(),
  reason: z.enum(["manual", "auto", "interval", "restore"]),
  label: z.string().optional(),
  wordCount: z.number().int().min(0),
  sceneCount: z.number().int().min(0),
})

// POST /api/screenplays/[id]/versions - Create a new version
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
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = createVersionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { content, reason, label, wordCount, sceneCount } = result.data

    // Get the next version number
    const lastVersion = await prisma.screenplayVersion.findFirst({
      where: { screenplayId: id },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    })

    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1

    const version = await prisma.screenplayVersion.create({
      data: {
        screenplayId: id,
        content,
        versionNumber,
        label,
        reason,
        wordCount,
        sceneCount,
        createdBy: session.user.id,
      },
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
      },
    })

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    console.error("Error creating version:", error)
    return NextResponse.json(
      { error: "Failed to create version" },
      { status: 500 }
    )
  }
}
