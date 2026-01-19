import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"

async function checkBudgetAccess(budgetId: string, userId: string, supabase: any) {
  const { data: budget, error } = await supabase
    .from("Budget")
    .select(`
      *,
      project:Project(
        id, userId, teamId,
        team:Team(id, members:TeamMember(userId))
      )
    `)
    .eq("id", budgetId)
    .single()

  if (error?.code === "PGRST116" || !budget) {
    return { allowed: false, notFound: true, budget: null }
  }
  if (error) throw error

  if (budget.userId === userId) {
    return { allowed: true, notFound: false, budget }
  }

  if (budget.project?.team?.members?.some((m: { userId: string }) => m.userId === userId)) {
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
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkBudgetAccess(id, user.id, supabase)

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
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const access = await checkBudgetAccess(id, user.id, supabase)

    if (access.notFound) {
      throw new NotFoundError("Budget")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const { data: budget, error } = await supabase
      .from("Budget")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return budget
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkBudgetAccess(id, user.id, supabase)

    if (access.notFound) {
      throw new NotFoundError("Budget")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const { error } = await supabase
      .from("Budget")
      .delete()
      .eq("id", id)

    if (error) throw error

    return { success: true }
  },
})
