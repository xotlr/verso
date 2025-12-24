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

  // Owner access
  if (callsheet.userId === userId) {
    return { allowed: true, callsheet }
  }

  // Team member access
  if (callsheet.project?.team && callsheet.project.team.members.length > 0) {
    return { allowed: true, callsheet }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

// GET /api/callsheets/[id]/share - List all share links for a callsheet
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

    const shareLinks = await prisma.callsheetShareLink.findMany({
      where: { callsheetId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ shareLinks })
  } catch (error) {
    console.error("[CALLSHEET_SHARE_GET]", error)
    return NextResponse.json(
      { error: "Failed to fetch share links" },
      { status: 500 }
    )
  }
}

const createShareLinkSchema = z.object({
  filterType: z.enum(["all", "department", "person"]).default("all"),
  filterValue: z.string().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
})

// POST /api/callsheets/[id]/share - Create a new share link
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
    const result = createShareLinkSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { filterType, filterValue, expiresAt } = result.data

    const shareLink = await prisma.callsheetShareLink.create({
      data: {
        callsheetId: id,
        userId: session.user.id,
        filterType,
        filterValue: filterValue || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json({ shareLink }, { status: 201 })
  } catch (error) {
    console.error("[CALLSHEET_SHARE_POST]", error)
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    )
  }
}
