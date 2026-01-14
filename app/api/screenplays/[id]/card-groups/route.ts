import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { z } from "zod"

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().default("blue"),
  order: z.number().int().min(0).default(0),
})

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  order: z.number().int().min(0).optional(),
})

/**
 * GET /api/screenplays/[id]/card-groups
 * Get all custom card groups for a screenplay
 */
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

    const groups = await prisma.customCardGroup.findMany({
      where: { screenplayId: id },
      orderBy: { order: "asc" },
    })

    return groups
  },
})

/**
 * POST /api/screenplays/[id]/card-groups
 * Create a new custom card group
 */
export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params, request }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const body = await request.json()
    const data = CreateGroupSchema.parse(body)

    const group = await prisma.customCardGroup.create({
      data: {
        screenplayId: id,
        name: data.name,
        color: data.color,
        order: data.order,
      },
    })

    return group
  },
})

/**
 * PUT /api/screenplays/[id]/card-groups
 * Bulk update custom card groups (reorder, update multiple)
 */
export const PUT = createApiHandler({
  auth: "required",
  handler: async ({ user, params, request }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const body = await request.json()

    if (!Array.isArray(body)) {
      throw new BadRequestError("Expected array of groups")
    }

    // Verify all groups belong to this screenplay
    const groupIds = body.map((g) => g.id).filter(Boolean)
    if (groupIds.length > 0) {
      const existingGroups = await prisma.customCardGroup.findMany({
        where: {
          id: { in: groupIds },
          screenplayId: id,
        },
      })

      if (existingGroups.length !== groupIds.length) {
        throw new ForbiddenError("Some groups don't belong to this screenplay")
      }
    }

    // Update all groups in a transaction
    const updates = await Promise.all(
      body.map((group) => {
        const data = UpdateGroupSchema.parse({
          name: group.name,
          color: group.color,
          order: group.order,
        })

        return prisma.customCardGroup.update({
          where: { id: group.id },
          data,
        })
      })
    )

    return updates
  },
})
