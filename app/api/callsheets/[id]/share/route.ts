import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function checkCallsheetAccess(callsheetId: string, userId: string) {
  const callsheet = await prisma.callsheet.findUnique({
    where: { id: callsheetId },
    include: {
      project: {
        include: {
          team: {
            include: { members: { where: { userId } } },
          },
        },
      },
    },
  })

  if (!callsheet) {
    return { allowed: false, notFound: true, callsheet: null }
  }

  if (callsheet.userId === userId) {
    return { allowed: true, notFound: false, callsheet }
  }

  if (callsheet.project?.team && callsheet.project.team.members.length > 0) {
    return { allowed: true, notFound: false, callsheet }
  }

  return { allowed: false, notFound: false, callsheet: null }
}

const createShareLinkSchema = z.object({
  filterType: z.enum(["all", "department", "person"]).default("all"),
  filterValue: z.string().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const shareLinks = await prisma.callsheetShareLink.findMany({
      where: { callsheetId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true } },
      },
    })

    return { shareLinks }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createShareLinkSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const shareLink = await prisma.callsheetShareLink.create({
      data: {
        callsheetId: id,
        userId: user.id,
        filterType: data.filterType,
        filterValue: data.filterValue || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    })

    return { shareLink }
  },
})
