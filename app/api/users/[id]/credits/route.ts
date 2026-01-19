import { z } from "zod"
import { createApiHandler, ForbiddenError, BadRequestError } from "@/lib/api"

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
  handler: async ({ params, supabase }) => {
    const { id } = params

    const { data: credits, error } = await supabase
      .from("Credit")
      .select(`
        id, title, role, year, projectId, isManual, displayOrder,
        project:Project(id, name, coverImage)
      `)
      .eq("userId", id)
      .order("displayOrder", { ascending: true })
      .order("year", { ascending: false })

    if (error) throw error

    return credits || []
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createCreditSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    if (user.id !== id) {
      throw new ForbiddenError()
    }

    // Check existing count
    const { count } = await supabase
      .from("Credit")
      .select("*", { count: "exact", head: true })
      .eq("userId", id)

    if ((count || 0) >= 10) {
      throw new BadRequestError(
        "Maximum 10 credits allowed. Remove one to add another."
      )
    }

    // Get max display order
    const { data: maxOrderData } = await supabase
      .from("Credit")
      .select("displayOrder")
      .eq("userId", id)
      .order("displayOrder", { ascending: false })
      .limit(1)
      .single()

    const nextOrder = ((maxOrderData?.displayOrder as number) ?? -1) + 1

    const { data: credit, error } = await supabase
      .from("Credit")
      .insert({
        userId: id,
        title: data.title,
        role: data.role,
        year: data.year,
        projectId: data.projectId ?? null,
        isManual: !data.projectId,
        displayOrder: nextOrder,
      })
      .select("id, title, role, year, projectId, isManual, displayOrder")
      .single()

    if (error) throw error

    return credit
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: reorderCreditsSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    if (user.id !== id) {
      throw new ForbiddenError()
    }

    // Update each credit's display order
    for (let i = 0; i < data.creditIds.length; i++) {
      const { error } = await supabase
        .from("Credit")
        .update({ displayOrder: i })
        .eq("id", data.creditIds[i])
        .eq("userId", id)

      if (error) throw error
    }

    return { success: true }
  },
})
