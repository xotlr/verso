import { z } from "zod"
import { createApiHandler, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const usersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
})

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ searchParams }) => {
    const queryResult = usersQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      search: searchParams.get("search") || undefined,
    })

    if (!queryResult.success) {
      return { error: "Invalid query parameters" }
    }

    const { limit, offset, search } = queryResult.data

    const where: Record<string, unknown> = { isPublic: true }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          banner: true,
          title: true,
          bio: true,
          location: true,
          _count: { select: { projects: true, screenplays: true } },
        },
      }),
      prisma.user.count({ where }),
    ])

    return { users, total, hasMore: offset + users.length < total }
  },
})
