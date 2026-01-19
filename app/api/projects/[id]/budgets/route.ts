import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"

async function hasProjectAccess(projectId: string, userId: string, supabase: any): Promise<boolean> {
  const { data: project } = await supabase
    .from("Project")
    .select(`
      id, userId, teamId,
      team:Team(id, members:TeamMember(userId))
    `)
    .eq("id", projectId)
    .single()

  if (!project) return false
  if (project.userId === userId) return true
  if (project.team?.members?.some((m: { userId: string }) => m.userId === userId)) return true

  return false
}

const createBudgetSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  total: z.number().default(0),
  data: z.any().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id, supabase)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: budgets, error } = await supabase
      .from("Budget")
      .select("*")
      .eq("projectId", projectId)
      .order("createdAt", { ascending: false })

    if (error) throw error

    return budgets
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createBudgetSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id, supabase)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: budget, error } = await supabase
      .from("Budget")
      .insert({
        ...data,
        userId: user.id,
        projectId,
      })
      .select()
      .single()

    if (error) throw error

    return budget
  },
})
