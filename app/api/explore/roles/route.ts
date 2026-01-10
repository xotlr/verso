import { z } from "zod"
import { createApiHandler, RATE_LIMITS } from "@/lib/api"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const rolesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
  role: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  isPaid: z.enum(["true", "false"]).optional(),
})

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ searchParams }) => {
    const queryResult = rolesQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      search: searchParams.get("search") || undefined,
      role: searchParams.get("role") || undefined,
      location: searchParams.get("location") || undefined,
      isPaid: searchParams.get("isPaid") || undefined,
    })

    if (!queryResult.success) {
      return { error: "Invalid query parameters" }
    }

    const { limit, offset, search, role, location, isPaid } = queryResult.data

    const session = await auth()
    const userId = session?.user?.id

    const where: Record<string, unknown> = { project: { isPublic: true } }

    if (role && role !== "all") {
      where.role = role
    }

    if (location) {
      where.location = { contains: location, mode: "insensitive" }
    }

    if (isPaid !== undefined) {
      where.isPaid = isPaid === "true"
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { project: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    const [roleNeeds, total] = await Promise.all([
      prisma.projectRoleNeed.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
              user: { select: { id: true, name: true, image: true } },
            },
          },
          _count: { select: { applications: true } },
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

    return { roleNeeds: transformedRoleNeeds, total, hasMore: offset + roleNeeds.length < total }
  },
})
