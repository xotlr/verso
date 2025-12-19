import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/users/search - Search users by name or email for autocomplete
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20)

    // Search by name, email, or username (case-insensitive)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          // Exclude current user
          { id: { not: session.user.id } },
          // Search in name, email, or username
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { username: { contains: query, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        username: true,
      },
      take: limit,
      orderBy: { name: "asc" },
    })

    // Mask email for privacy (show partial)
    const maskedUsers = users.map((user) => ({
      ...user,
      email: user.email ? maskEmail(user.email) : null,
    }))

    return NextResponse.json(maskedUsers)
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    )
  }
}

// Mask email for privacy: john.doe@example.com -> joh***@example.com
function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return email

  const visibleChars = Math.min(3, local.length)
  const masked = local.slice(0, visibleChars) + "***"
  return `${masked}@${domain}`
}
