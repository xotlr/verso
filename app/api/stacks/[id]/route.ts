import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { logger } from "@/lib/logger"

const updateStackSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  projectId: z.string().nullable().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const { data: stack, error } = await supabase
      .from("Stack")
      .select(`
        id, name, createdAt, updatedAt, projectId,
        project:Project(id, name),
        screenplays:Screenplay(id, title, wordCount, updatedAt, type, genre, logline)
      `)
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (error) handleSupabaseError(error, "Stack")
    if (!stack) throw new NotFoundError("Stack")

    return {
      ...stack,
      _count: { screenplays: stack.screenplays?.length || 0 },
    }
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateStackSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params
    const { name, projectId } = data

    // Verify stack exists and belongs to user
    const { data: existingStack, error: fetchError } = await supabase
      .from("Stack")
      .select("id")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (fetchError) handleSupabaseError(fetchError, "Stack")
    if (!existingStack) throw new NotFoundError("Stack")

    // Verify project access if provided
    if (projectId) {
      const { data: project } = await supabase
        .from("Project")
        .select("id")
        .eq("id", projectId)
        .eq("userId", user.id)
        .single()

      if (!project) {
        throw new ForbiddenError("Project not found or access denied")
      }
    }

    // Update stack
    const { data: stack, error: updateError } = await supabase
      .from("Stack")
      .update({
        ...(name !== undefined && { name }),
        ...(projectId !== undefined && { projectId }),
      })
      .eq("id", id)
      .select(`
        id, name, createdAt, updatedAt, projectId,
        project:Project(id, name),
        screenplays:Screenplay(id, title, wordCount, updatedAt)
      `)
      .single()

    if (updateError) handleSupabaseError(updateError, "Stack")

    return {
      ...stack,
      _count: { screenplays: stack.screenplays?.length || 0 },
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    // Verify stack exists and belongs to user
    const { data: existingStack, error: fetchError } = await supabase
      .from("Stack")
      .select("id")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (fetchError) handleSupabaseError(fetchError, "Stack")
    if (!existingStack) throw new NotFoundError("Stack")

    // Remove stack reference from screenplays
    await supabase
      .from("Screenplay")
      .update({ stackId: null })
      .eq("stackId", id)

    // Delete stack
    const { error: deleteError } = await supabase
      .from("Stack")
      .delete()
      .eq("id", id)

    if (deleteError) handleSupabaseError(deleteError, "Stack")

    logger.audit("delete", "stack", id, { userId: user.id })

    return { success: true }
  },
})
