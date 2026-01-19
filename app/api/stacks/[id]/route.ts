import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"

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

    if (error?.code === "PGRST116" || !stack) {
      throw new NotFoundError("Stack")
    }
    if (error) throw error

    return {
      ...stack,
      _count: { screenplays: stack.screenplays?.length || 0 },
    }
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateStackSchema,
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

    if (fetchError?.code === "PGRST116" || !existingStack) {
      throw new NotFoundError("Stack")
    }
    if (fetchError) throw fetchError

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

    if (updateError) throw updateError

    return {
      ...stack,
      _count: { screenplays: stack.screenplays?.length || 0 },
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    // Verify stack exists and belongs to user
    const { data: existingStack, error: fetchError } = await supabase
      .from("Stack")
      .select("id")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (fetchError?.code === "PGRST116" || !existingStack) {
      throw new NotFoundError("Stack")
    }
    if (fetchError) throw fetchError

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

    if (deleteError) throw deleteError

    return { success: true }
  },
})
