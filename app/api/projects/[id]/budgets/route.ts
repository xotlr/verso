import { z } from "zod"
import { createApiHandler, NotFoundError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { hasProjectAccess, requirePermission } from "@/lib/project-access"

const createBudgetSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  total: z.number().default(0),
  data: z.any().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(supabase, projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: budgets, error } = await supabase
      .from("Budget")
      .select("*")
      .eq("projectId", projectId)
      .order("createdAt", { ascending: false })

    if (error) handleSupabaseError(error, "Budget")

    return budgets
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createBudgetSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    // Require editor permission to create budgets
    await requirePermission(supabase, projectId, user.id, "editor")

    const { data: budget, error } = await supabase
      .from("Budget")
      .insert({
        ...data,
        userId: user.id,
        projectId,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error, "Budget")

    return budget
  },
})
