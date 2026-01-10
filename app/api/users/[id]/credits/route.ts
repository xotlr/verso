import { z } from "zod"
import { createApiHandler, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const createCreditSchema = z.object({
  title: z.string().min(1).max(200),
  role: z.string().min(1).max(100),
  year: z.number().int().min(1900).max(2100),
  projectId: z.string().cuid().nullable().optional(),
})

const reorderCreditsSchema = z.object({
  creditIds: z.array(z.string().cuid()),
})

export const GET = createApiHandler({
  auth: "none",
  handler: async ({ params }) => {
    const { id } = params

    const credits = await prisma.credit.findMany({
      where: { userId: id },
      orderBy: [{ displayOrder: "asc" }, { year: "desc" }],
      select: {
        id: true,
        title: true,
        role: true,
        year: true,
        projectId: true,
        isManual: true,
        displayOrder: true,
        project: {
          select: {
            id: true,
            name: true,
            coverImage: true,
          },
        },
      },
    })

    return credits
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createCreditSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    if (user.id !== id) {
      throw new ForbiddenError()
    }

    const existingCount = await prisma.credit.count({
      where: { userId: id },
    })

    if (existingCount >= 10) {
      throw new BadRequestError(
        "Maximum 10 credits allowed. Remove one to add another."
      )
    }

    const maxOrder = await prisma.credit.aggregate({
      where: { userId: id },
      _max: { displayOrder: true },
    })
    const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1

    const credit = await prisma.credit.create({
      data: {
        userId: id,
        title: data.title,
        role: data.role,
        year: data.year,
        projectId: data.projectId ?? null,
        isManual: !data.projectId,
        displayOrder: nextOrder,
      },
      select: {
        id: true,
        title: true,
        role: true,
        year: true,
        projectId: true,
        isManual: true,
        displayOrder: true,
      },
    })

    return credit
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: reorderCreditsSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    if (user.id !== id) {
      throw new ForbiddenError()
    }

    await prisma.$transaction(
      data.creditIds.map((creditId, index) =>
        prisma.credit.update({
          where: { id: creditId, userId: id },
          data: { displayOrder: index },
        })
      )
    )

    return { success: true }
  },
})
