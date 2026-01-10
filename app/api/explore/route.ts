import { z } from "zod"
import { createApiHandler, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

const exploreQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  genre: z.string().max(100).optional(),
  search: z.string().max(500).optional(),
  type: z.enum(["screenplays", "genres"]).default("screenplays"),
})

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ searchParams }) => {
    const queryResult = exploreQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      genre: searchParams.get("genre") || undefined,
      search: searchParams.get("search") || undefined,
      type: searchParams.get("type") || undefined,
    })

    if (!queryResult.success) {
      return { error: "Invalid query parameters", details: queryResult.error.issues }
    }

    const { limit, offset, genre, search, type } = queryResult.data

    if (type === "genres") {
      const genres = await prisma.screenplay.findMany({
        where: { isPublic: true, genre: { not: null } },
        select: { genre: true },
        distinct: ["genre"],
      })
      return { genres: genres.map((g) => g.genre).filter(Boolean) }
    }

    const where: Record<string, unknown> = { isPublic: true }

    if (genre) {
      where.genre = genre
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { synopsis: { contains: search, mode: "insensitive" } },
      ]
    }

    const [screenplays, total] = await Promise.all([
      prisma.screenplay.findMany({
        where,
        orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          synopsis: true,
          genre: true,
          views: true,
          publishedAt: true,
          user: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.screenplay.count({ where }),
    ])

    return {
      screenplays,
      total,
      hasMore: offset + screenplays.length < total,
    }
  },
})
