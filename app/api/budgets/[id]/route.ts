import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function checkBudgetAccess(budgetId: string, userId: string) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
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

  if (!budget) {
    return { allowed: false, notFound: true, budget: null }
  }

  if (budget.userId === userId) {
    return { allowed: true, notFound: false, budget }
  }

  if (budget.project?.team && budget.project.team.members.length > 0) {
    return { allowed: true, notFound: false, budget }
  }

  return { allowed: false, notFound: false, budget: null }
}

const updateBudgetSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  total: z.number().optional(),
  data: z.any().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const access = await checkBudgetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Budget")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    return access.budget
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateBudgetSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const access = await checkBudgetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Budget")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const budget = await prisma.budget.update({
      where: { id },
      data,
    })

    return budget
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const access = await checkBudgetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Budget")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    await prisma.budget.delete({
      where: { id },
    })

    return { success: true }
  },
})
