import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit"

// GET /api/share/[token] - Validate token and get screenplay
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Rate limit to prevent token brute force attacks
    const clientIp = getClientIp(request)
    const rateLimitResult = await rateLimit(`share-token:${clientIp}`, RATE_LIMITS.API)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const { token } = await params

    // Find the share link by token
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        screenplay: {
          select: {
            id: true,
            title: true,
            content: true,
            synopsis: true,
            type: true,
            format: true,
            genre: true,
            logline: true,
            author: true,
            wordCount: true,
            createdAt: true,
            updatedAt: true,
            // Include user for author fallback
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    // Token not found
    if (!shareLink) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 }
      )
    }

    // Link is deactivated
    if (!shareLink.isActive) {
      return NextResponse.json(
        { error: "This share link has been revoked" },
        { status: 410 }
      )
    }

    // Link has expired
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 }
      )
    }

    // Increment view count (fire and forget)
    prisma.screenplay.update({
      where: { id: shareLink.screenplayId },
      data: { views: { increment: 1 } },
    }).catch(console.error)

    // Return screenplay with permission level
    return NextResponse.json({
      screenplay: {
        ...shareLink.screenplay,
        author: shareLink.screenplay.author || shareLink.screenplay.user?.name || 'Anonymous',
      },
      permission: shareLink.permission,
      expiresAt: shareLink.expiresAt,
    })
  } catch (error) {
    console.error("[SHARE_TOKEN_GET]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
