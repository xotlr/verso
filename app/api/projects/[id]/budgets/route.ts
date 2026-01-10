import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        include: { members: { where: { userId } } },
      },
    },
  })

  if (!project) return false
  if (project.userId === userId) return true
  if (project.team && project.team.members.length > 0) return true

  return false
}

const createBudgetSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  total: z.number().default(0),
  data: z.any().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const budgets = await prisma.budget.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    })

    return budgets
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createBudgetSchema,
  handler: async ({ user, params, data }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const budget = await prisma.budget.create({
      data: {
        ...data,
        userId: user.id,
        projectId,
      },
    })

    return budget
  },
})
