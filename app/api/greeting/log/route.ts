import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schema for logging a greeting
const logGreetingSchema = z.object({
  category: z.string().min(1, "Category is required"),
  text: z.string().min(1, "Greeting text is required"),
})

// POST /api/greeting/log - Log a shown greeting (fire-and-forget from client)
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const result = logGreetingSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { category, text } = result.data

    // Log the greeting (fire-and-forget, don't block on result)
    await prisma.greetingHistory.create({
      data: {
        userId: session.user.id,
        category,
        text,
      },
    })

    // Cleanup: Keep only last 20 greetings per user to avoid table bloat
    const oldGreetings = await prisma.greetingHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { shownAt: "desc" },
      skip: 20,
      select: { id: true },
    })

    if (oldGreetings.length > 0) {
      await prisma.greetingHistory.deleteMany({
        where: {
          id: { in: oldGreetings.map((g) => g.id) },
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error logging greeting:", error)
    // Return success anyway - this is fire-and-forget, don't block the user
    return NextResponse.json({ success: true })
  }
}
