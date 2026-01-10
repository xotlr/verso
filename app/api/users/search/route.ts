import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return email

  const visibleChars = Math.min(3, local.length)
  const masked = local.slice(0, visibleChars) + "***"
  return `${masked}@${domain}`
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams }) => {
    const query = searchParams.get("q")?.trim()

    if (!query || query.length < 2) {
      return []
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20)

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: user.id } },
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

    return users.map((u) => ({
      ...u,
      email: u.email ? maskEmail(u.email) : null,
    }))
  },
})
