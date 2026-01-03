import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { validateImageUrl } from "@/lib/file-validation"
import { logger } from "@/lib/logger"
import { z } from "zod"

// GET /api/screenplays/[id]/scenes/[sceneId]/attachments - List scene attachments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id, sceneId } = await params
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const attachments = await prisma.sceneAttachment.findMany({
      where: {
        screenplayId: id,
        sceneId,
      },
      orderBy: { displayOrder: "asc" },
    })

    return NextResponse.json(attachments)
  } catch (error) {
    logger.error("Failed to fetch scene attachments", error as Error)
    return NextResponse.json(
      { error: "Failed to fetch scene attachments" },
      { status: 500 }
    )
  }
}

// Validation schema for creating attachment
const createAttachmentSchema = z.object({
  type: z.enum(["image", "reference", "moodboard"]),
  url: z.string().url(),
  filename: z.string().optional(),
  caption: z.string().optional(),
})

// POST /api/screenplays/[id]/scenes/[sceneId]/attachments - Add scene attachment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id, sceneId } = await params
    const access = await checkScreenplayAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = createAttachmentSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { type, url, filename, caption } = result.data

    // Server-side validation: verify URL is from allowed storage domain and is valid image
    try {
      validateImageUrl(url)
    } catch (validationError) {
      logger.security('Invalid attachment URL rejected', {
        url: url.substring(0, 100), // Truncate for logging
        screenplayId: id,
        sceneId,
        userId: session.user.id,
      })
      return NextResponse.json(
        { error: (validationError as Error).message },
        { status: 400 }
      )
    }

    // Check attachment limit (max 10 per scene)
    const existingCount = await prisma.sceneAttachment.count({
      where: { screenplayId: id, sceneId },
    })

    if (existingCount >= 10) {
      return NextResponse.json(
        { error: "Maximum 10 attachments per scene" },
        { status: 400 }
      )
    }

    // Get next display order
    const lastAttachment = await prisma.sceneAttachment.findFirst({
      where: { screenplayId: id, sceneId },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    })

    const displayOrder = (lastAttachment?.displayOrder ?? -1) + 1

    const attachment = await prisma.sceneAttachment.create({
      data: {
        screenplayId: id,
        sceneId,
        type,
        url,
        filename,
        caption,
        displayOrder,
      },
    })

    logger.audit('create', 'sceneAttachment', attachment.id, {
      screenplayId: id,
      sceneId,
      type,
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    logger.error("Failed to create scene attachment", error as Error)
    return NextResponse.json(
      { error: "Failed to create scene attachment" },
      { status: 500 }
    )
  }
}
