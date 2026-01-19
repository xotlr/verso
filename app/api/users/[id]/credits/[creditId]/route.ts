import { z } from "zod"
import { createApiHandler, ForbiddenError, NotFoundError } from "@/lib/api"

const updateCreditSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  role: z.string().min(1).max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateCreditSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id, creditId } = params

    if (user.id !== id) {
      throw new ForbiddenError()
    }

    // Check if credit exists and belongs to user
    const { data: existing, error: existingError } = await supabase
      .from("Credit")
      .select("id")
      .eq("id", creditId)
      .eq("userId", id)
      .single()

    if (existingError?.code === "PGRST116" || !existing) {
      throw new NotFoundError("Credit")
    }
    if (existingError) throw existingError

    const { data: credit, error } = await supabase
      .from("Credit")
      .update(data)
      .eq("id", creditId)
      .select("id, title, role, year, projectId, isManual, displayOrder")
      .single()

    if (error) throw error

    return credit
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id, creditId } = params

    if (user.id !== id) {
      throw new ForbiddenError()
    }

    // Check if credit exists and belongs to user
    const { data: existing, error: existingError } = await supabase
      .from("Credit")
      .select("id")
      .eq("id", creditId)
      .eq("userId", id)
      .single()

    if (existingError?.code === "PGRST116" || !existing) {
      throw new NotFoundError("Credit")
    }
    if (existingError) throw existingError

    const { error } = await supabase
      .from("Credit")
      .delete()
      .eq("id", creditId)

    if (error) throw error

    return { success: true }
  },
})
