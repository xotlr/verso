import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"

const createSideSchema = z.object({
  filterType: z.enum(["all", "character", "scenes"]).default("all"),
  filterValue: z.string().optional().nullable(),
  title: z.string().max(255).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  callsheetId: z.string().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const sides = await prisma.digitalSide.findMany({
      where: { screenplayId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    return { sides }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createSideSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { filterType, filterValue, title, expiresAt, callsheetId } = data

    if (callsheetId) {
      const callsheet = await prisma.callsheet.findUnique({
        where: { id: callsheetId },
      })
      if (!callsheet) {
        throw new NotFoundError("Callsheet")
      }
    }

    const generatedTitle = title || (
      filterType === "character" && filterValue
        ? `${filterValue}'s Sides`
        : filterType === "scenes" && filterValue
        ? `Selected Scenes`
        : `${access.screenplay?.title} - Full Sides`
    )

    const side = await prisma.digitalSide.create({
      data: {
        screenplayId: id,
        userId: user.id,
        filterType,
        filterValue: filterValue || null,
        title: generatedTitle,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        callsheetId: callsheetId || null,
      },
    })

    return { side }
  },
})
