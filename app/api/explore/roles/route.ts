import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const rolesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
  role: z.string().max(50).optional(), // Filter by role type
  location: z.string().max(100).optional(),
  isPaid: z.enum(["true", "false"]).optional(),
})

// GET /api/explore/roles - Browse open roles from public projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const queryResult = rolesQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      search: searchParams.get("search") || undefined,
      role: searchParams.get("role") || undefined,
      location: searchParams.get("location") || undefined,
      isPaid: searchParams.get("isPaid") || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      )
    }

    const { limit, offset, search, role, location, isPaid } = queryResult.data

    // Get current user to check if they've applied
    const session = await auth()
    const userId = session?.user?.id

    // Build where clause for role needs from public projects
    const where: Record<string, unknown> = {
      project: {
        isPublic: true,
      },
    }

    // Filter by role type
    if (role && role !== "all") {
      where.role = role
    }

    // Filter by location
    if (location) {
      where.location = { contains: location, mode: "insensitive" }
    }

    // Filter by paid status
    if (isPaid !== undefined) {
      where.isPaid = isPaid === "true"
    }

    // Search in project name or role description
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { project: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    const [roleNeeds, total] = await Promise.all([
      prisma.projectRoleNeed.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
        select: {
          id: true,
          role: true,
          description: true,
          location: true,
          isPaid: true,
          createdAt: true,
          project: {
            select: {
              id: true,
              name: true,
              banner: true,
              logo: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
          // Check if current user has applied
          ...(userId
            ? {
                applications: {
                  where: { userId },
                  select: { id: true, status: true },
                  take: 1,
                },
              }
            : {}),
        },
      }),
      prisma.projectRoleNeed.count({ where }),
    ])

    // Transform to add hasApplied field
    const transformedRoleNeeds = roleNeeds.map((roleNeed) => {
      const { applications, ...rest } = roleNeed as typeof roleNeed & {
        applications?: { id: string; status: string }[]
      }
      return {
        ...rest,
        hasApplied: applications && applications.length > 0,
        applicationStatus: applications?.[0]?.status || null,
      }
    })

    return NextResponse.json({
      roleNeeds: transformedRoleNeeds,
      total,
      hasMore: offset + roleNeeds.length < total,
    })
  } catch (error) {
    console.error("Error fetching open roles:", error)
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    )
  }
}
