import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const projectsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
})

// GET /api/explore/projects - Browse public projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const queryResult = projectsQuerySchema.safeParse({
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

    // Build where clause for public projects
    const where: Record<string, unknown> = {
      isPublic: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: {
          publishedAt: "desc",
        },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          banner: true,
          logo: true,
          status: true,
          publishedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          roles: {
            select: {
              id: true,
              role: true,
              name: true,
              user: {
                select: {
                  id: true,
                  image: true,
                },
              },
            },
            take: 10,
          },
          _count: {
            select: {
              screenplays: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ])

    return NextResponse.json({
      projects,
      total,
      hasMore: offset + projects.length < total,
    })
  } catch (error) {
    console.error("Error fetching public projects:", error)
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    )
  }
}
