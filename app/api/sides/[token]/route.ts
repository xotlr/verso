import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { filterByCharacter, filterByScenes } from "@/lib/screenplay/sides-filter"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

// Rate limit: 60 requests per minute per IP+token (allows refreshes, prevents abuse)
const SIDES_RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 }

// GET /api/sides/[token] - Public: fetch filtered screenplay content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Rate limit by IP + token to prevent enumeration and abuse
    const clientIp = getClientIp(request)
    const rateLimitResult = await rateLimit(`sides:${clientIp}:${token}`, SIDES_RATE_LIMIT)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    const side = await prisma.digitalSide.findUnique({
      where: { token },
      include: {
        screenplay: {
          select: {
            id: true,
            title: true,
            content: true,
            author: true,
            type: true,
            format: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    // Token not found
    if (!side) {
      return NextResponse.json(
        { error: "Digital sides not found" },
        { status: 404 }
      )
    }

    // Link is deactivated
    if (!side.isActive) {
      return NextResponse.json(
        { error: "This digital sides link has been revoked" },
        { status: 410 }
      )
    }

    // Link has expired
    if (side.expiresAt && new Date() > side.expiresAt) {
      return NextResponse.json(
        { error: "This digital sides link has expired" },
        { status: 410 }
      )
    }

    // Parse the content and apply filters
    let content: object
    try {
      content = JSON.parse(side.screenplay.content)
    } catch {
      return NextResponse.json(
        { error: "Invalid screenplay content" },
        { status: 500 }
      )
    }

    // Apply content filtering based on filterType
    let filteredContent = content
    if (side.filterType === "character" && side.filterValue) {
      filteredContent = filterByCharacter(content, side.filterValue)
    } else if (side.filterType === "scenes" && side.filterValue) {
      const sceneIds = side.filterValue.split(",").map((s) => s.trim())
      filteredContent = filterByScenes(content, sceneIds)
    }

    // Fetch callsheet if linked
    let callsheet = null
    if (side.callsheetId) {
      callsheet = await prisma.callsheet.findUnique({
        where: { id: side.callsheetId },
        select: {
          id: true,
          title: true,
          shootDate: true,
          callTime: true,
          primaryLocation: true,
          data: true,
        },
      })
    }

    // Increment view count for the screenplay (fire and forget)
    prisma.screenplay
      .update({
        where: { id: side.screenplay.id },
        data: { views: { increment: 1 } },
      })
      .catch(console.error)

    return NextResponse.json({
      title: side.title,
      screenplay: {
        title: side.screenplay.title,
        author:
          side.screenplay.author ||
          side.screenplay.user?.name ||
          "Anonymous",
        content: filteredContent,
        type: side.screenplay.type,
        format: side.screenplay.format,
      },
      filterType: side.filterType,
      filterValue: side.filterValue,
      expiresAt: side.expiresAt,
      callsheet,
      createdBy: side.user.name,
    })
  } catch (error) {
    console.error("[SIDES_TOKEN_GET]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/sides/[token] - Revoke a digital side (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { token } = await params

    const side = await prisma.digitalSide.findUnique({
      where: { token },
    })

    if (!side) {
      return NextResponse.json(
        { error: "Digital sides not found" },
        { status: 404 }
      )
    }

    // Only the creator can revoke
    if (side.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Soft delete by deactivating
    await prisma.digitalSide.update({
      where: { token },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[SIDES_TOKEN_DELETE]", error)
    return NextResponse.json(
      { error: "Failed to revoke digital sides" },
      { status: 500 }
    )
  }
}
