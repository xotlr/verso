import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { z } from "zod"

// GET /api/screenplays/[id]/characters - Get character roles for a screenplay
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

    // Fetch all character metadata for this screenplay
    const characterMetas = await prisma.characterMeta.findMany({
      where: { screenplayId: id },
    })

    // Convert to a roles map { characterName: role }
    const roles: Record<string, string> = {}
    for (const meta of characterMetas) {
      roles[meta.characterName] = meta.role
    }

    return NextResponse.json({ roles })
  } catch (error) {
    console.error("Error fetching character roles:", error)
    return NextResponse.json(
      { error: "Failed to fetch character roles" },
      { status: 500 }
    )
  }
}

// Schema for updating character roles
const updateRolesSchema = z.object({
  roles: z.record(z.string(), z.string()),
})

// PUT /api/screenplays/[id]/characters - Update character roles
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
    const result = updateRolesSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { roles } = result.data

    // Upsert each character role
    const operations = Object.entries(roles).map(([characterName, role]) =>
      prisma.characterMeta.upsert({
        where: {
          screenplayId_characterName: {
            screenplayId: id,
            characterName,
          },
        },
        update: { role },
        create: {
          screenplayId: id,
          characterName,
          role,
        },
      })
    )

    await prisma.$transaction(operations)

    return NextResponse.json({ success: true, roles })
  } catch (error) {
    console.error("Error updating character roles:", error)
    return NextResponse.json(
      { error: "Failed to update character roles" },
      { status: 500 }
    )
  }
}
