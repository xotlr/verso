import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { z } from "zod"

// GET /api/screenplays/[id]/sides - List all digital sides for a screenplay
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

    const sides = await prisma.digitalSide.findMany({
      where: { screenplayId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ sides })
  } catch (error) {
    console.error("[SIDES_GET]", error)
    return NextResponse.json(
      { error: "Failed to fetch digital sides" },
      { status: 500 }
    )
  }
}

const createSideSchema = z.object({
  filterType: z.enum(["all", "character", "scenes"]).default("all"),
  filterValue: z.string().optional().nullable(),
  title: z.string().max(255).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  callsheetId: z.string().optional().nullable(),
})

// POST /api/screenplays/[id]/sides - Create a new digital side
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
    const result = createSideSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { filterType, filterValue, title, expiresAt, callsheetId } = result.data

    // Validate callsheet if provided
    if (callsheetId) {
      const callsheet = await prisma.callsheet.findUnique({
        where: { id: callsheetId },
      })
      if (!callsheet) {
        return NextResponse.json(
          { error: "Callsheet not found" },
          { status: 404 }
        )
      }
    }

    // Generate title if not provided
    const generatedTitle = title || (
      filterType === "character" && filterValue
        ? `${filterValue}'s Sides`
        : filterType === "scenes" && filterValue
        ? `Selected Scenes`
        : `${access.screenplay?.title} - Full Sides`
    )

    const side = await prisma.digitalSide.create({
      data: {
        screenplayId: id,
        userId: session.user.id,
        filterType,
        filterValue: filterValue || null,
        title: generatedTitle,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        callsheetId: callsheetId || null,
      },
    })

    return NextResponse.json({ side }, { status: 201 })
  } catch (error) {
    console.error("[SIDES_POST]", error)
    return NextResponse.json(
      { error: "Failed to create digital side" },
      { status: 500 }
    )
  }
}
