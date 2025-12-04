import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const usersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
})

// GET /api/explore/users - Browse public user profiles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const queryResult = usersQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      search: searchParams.get("search") || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      )
    }

    const { limit, offset, search } = queryResult.data

    // Build where clause for public users
    const where: Record<string, unknown> = {
      isPublic: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          image: true,
          title: true,
          bio: true,
          location: true,
          _count: {
            select: {
              projects: true,
              screenplays: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users,
      total,
      hasMore: offset + users.length < total,
    })
  } catch (error) {
    console.error("Error fetching public users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}
