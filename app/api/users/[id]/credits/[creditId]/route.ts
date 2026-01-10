import { z } from "zod"
import { createApiHandler, ForbiddenError, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const updateCreditSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  role: z.string().min(1).max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateCreditSchema,
  handler: async ({ user, params, data }) => {
    const { id, creditId } = params

    if (user.id !== id) {
      throw new ForbiddenError()
    }

    const existing = await prisma.credit.findFirst({
      where: { id: creditId, userId: id },
    })

    if (!existing) {
      throw new NotFoundError("Credit")
    }

    const credit = await prisma.credit.update({
      where: { id: creditId },
      data,
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

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id, creditId } = params

    if (user.id !== id) {
      throw new ForbiddenError()
    }

    const existing = await prisma.credit.findFirst({
      where: { id: creditId, userId: id },
    })

    if (!existing) {
      throw new NotFoundError("Credit")
    }

    await prisma.credit.delete({
      where: { id: creditId },
    })

    return { success: true }
  },
})
