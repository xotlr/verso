import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const requestAccessSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  message: z.string().max(500, "Message too long").optional(),
})

// POST /api/share/[token]/request-access - Submit access request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    // Validate request body
    const validation = requestAccessSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      )
    }

    const { email, name, message } = validation.data

    // Find the share link by token
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        screenplay: {
          select: {
            id: true,
            title: true,
            userId: true,
            user: {
              select: {
                email: true,
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
        { error: "This share link is no longer active" },
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

    // Check if request already exists for this email
    const existingRequest = await prisma.accessRequest.findUnique({
      where: {
        shareLinkId_email: {
          shareLinkId: shareLink.id,
          email: email.toLowerCase(),
        },
      },
    })

    if (existingRequest) {
      // If already approved, let them know
      if (existingRequest.status === "APPROVED") {
        return NextResponse.json(
          { error: "Access has already been granted to this email" },
          { status: 409 }
        )
      }
      // If pending, update the request
      if (existingRequest.status === "PENDING") {
        await prisma.accessRequest.update({
          where: { id: existingRequest.id },
          data: {
            name,
            message,
            updatedAt: new Date(),
          },
        })
        return NextResponse.json({ success: true, updated: true })
      }
      // If denied, allow re-request
      if (existingRequest.status === "DENIED") {
        await prisma.accessRequest.update({
          where: { id: existingRequest.id },
          data: {
            name,
            message,
            status: "PENDING",
            respondedAt: null,
            updatedAt: new Date(),
          },
        })
        return NextResponse.json({ success: true, resubmitted: true })
      }
    }

    // Create new access request
    await prisma.accessRequest.create({
      data: {
        shareLinkId: shareLink.id,
        email: email.toLowerCase(),
        name,
        message,
      },
    })

    // TODO: Send email notification to screenplay owner
    // This would be implemented with a service like Resend or SendGrid
    // For now, we just create the request in the database

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[REQUEST_ACCESS_POST]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
