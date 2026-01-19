import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"

const screenplayIdsSchema = z.object({
  screenplayIds: z.array(z.string()).min(1, "At least one screenplay required"),
})

async function getStackWithScreenplays(stackId: string, supabase: any) {
  const { data: stack } = await supabase
    .from("Stack")
    .select(`
      id, name, createdAt, updatedAt, projectId,
      project:Project(id, name)
    `)
    .eq("id", stackId)
    .single()

  if (!stack) return null

  const { data: screenplays } = await supabase
    .from("Screenplay")
    .select("id, title, wordCount, updatedAt, type")
    .eq("stackId", stackId)
    .order("updatedAt", { ascending: false })

  return {
    ...stack,
    screenplays: screenplays || [],
    _count: { screenplays: screenplays?.length || 0 },
  }
}

export const POST = createApiHandler({
  auth: "required",
  schema: screenplayIdsSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: stackId } = params
    const { screenplayIds } = data

    const { data: stack, error: stackError } = await supabase
      .from("Stack")
      .select("id, projectId")
      .eq("id", stackId)
      .eq("userId", user.id)
      .single()

    if (stackError?.code === "PGRST116" || !stack) {
      throw new NotFoundError("Stack")
    }
    if (stackError) handleSupabaseError(stackError, "Stack")

    const { count: ownedCount } = await supabase
      .from("Screenplay")
      .select("*", { count: "exact", head: true })
      .in("id", screenplayIds)
      .eq("userId", user.id)

    if (ownedCount !== screenplayIds.length) {
      throw new ForbiddenError("One or more screenplays not found or access denied")
    }

    const updateData: { stackId: string; projectId?: string } = { stackId }
    if (stack.projectId) {
      updateData.projectId = stack.projectId
    }

    await supabase
      .from("Screenplay")
      .update(updateData)
      .in("id", screenplayIds)

    const updatedStack = await getStackWithScreenplays(stackId, supabase)
    return updatedStack
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  schema: screenplayIdsSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: stackId } = params
    const { screenplayIds } = data

    const { data: stack, error: stackError } = await supabase
      .from("Stack")
      .select("id")
      .eq("id", stackId)
      .eq("userId", user.id)
      .single()

    if (stackError?.code === "PGRST116" || !stack) {
      throw new NotFoundError("Stack")
    }
    if (stackError) handleSupabaseError(stackError, "Stack")

    // Remove screenplays from stack (must be owned by user and in this stack)
    await supabase
      .from("Screenplay")
      .update({ stackId: null })
      .in("id", screenplayIds)
      .eq("stackId", stackId)
      .eq("userId", user.id)

    const { count: remainingCount } = await supabase
      .from("Screenplay")
      .select("*", { count: "exact", head: true })
      .eq("stackId", stackId)

    if ((remainingCount || 0) <= 1) {
      if (remainingCount === 1) {
        await supabase
          .from("Screenplay")
          .update({ stackId: null })
          .eq("stackId", stackId)
      }

      await supabase
        .from("Stack")
        .delete()
        .eq("id", stackId)

      return { success: true, dissolved: true, message: "Stack was automatically dissolved" }
    }

    const updatedStack = await getStackWithScreenplays(stackId, supabase)
    return updatedStack
  },
})
