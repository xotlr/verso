import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { z } from "zod"
import { DEFAULT_ACTS } from "@/types/beat-board"

// Validation schema for acts
const actConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

const actsSchema = z.array(actConfigSchema).min(1).max(10)

// GET /api/screenplays/[id]/acts - Get acts configuration
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

    // Return stored acts or default
    const acts = access.screenplay?.acts || DEFAULT_ACTS
    return NextResponse.json(acts)
  } catch (error) {
    console.error("Error fetching acts:", error)
    return NextResponse.json(
      { error: "Failed to fetch acts" },
      { status: 500 }
    )
  }
}

// PUT /api/screenplays/[id]/acts - Update acts configuration
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
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = actsSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const screenplay = await prisma.screenplay.update({
      where: { id },
      data: { acts: result.data },
      select: { acts: true },
    })

    return NextResponse.json(screenplay.acts)
  } catch (error) {
    console.error("Error updating acts:", error)
    return NextResponse.json(
      { error: "Failed to update acts" },
      { status: 500 }
    )
  }
}
