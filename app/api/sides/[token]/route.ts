import { createApiHandler, NotFoundError, GoneError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { filterByCharacter, filterByScenes } from "@/lib/screenplay/sides-filter"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

const SIDES_RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 }

// GET - Public with rate limiting, custom handler needed
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
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

    if (!side) {
      return NextResponse.json({ error: "Digital sides not found" }, { status: 404 })
    }

    if (!side.isActive) {
      return NextResponse.json(
        { error: "This digital sides link has been revoked" },
        { status: 410 }
      )
    }

    if (side.expiresAt && new Date() > side.expiresAt) {
      return NextResponse.json(
        { error: "This digital sides link has expired" },
        { status: 410 }
      )
    }

    let content: object
    try {
      content = JSON.parse(side.screenplay.content)
    } catch {
      return NextResponse.json(
        { error: "Invalid screenplay content" },
        { status: 500 }
      )
    }

    let filteredContent = content
    if (side.filterType === "character" && side.filterValue) {
      filteredContent = filterByCharacter(content, side.filterValue)
    } else if (side.filterType === "scenes" && side.filterValue) {
      const sceneIds = side.filterValue.split(",").map((s) => s.trim())
      filteredContent = filterByScenes(content, sceneIds)
    }

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

    prisma.screenplay
      .update({
        where: { id: side.screenplay.id },
        data: { views: { increment: 1 } },
      })
      .catch((err) => logger.error("Failed to increment view count", err instanceof Error ? err : undefined))

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
    logger.error("Failed to fetch digital sides", error instanceof Error ? error : undefined, {
      token,
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { token } = params

    const side = await prisma.digitalSide.findUnique({
      where: { token },
    })

    if (!side) {
      throw new NotFoundError("Digital sides")
    }

    if (side.userId !== user.id) {
      throw new ForbiddenError()
    }

    await prisma.digitalSide.update({
      where: { token },
      data: { isActive: false },
    })

    return { success: true }
  },
})
