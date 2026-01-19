import { z } from "zod"
import { createApiHandler, BadRequestError, ForbiddenError, RATE_LIMITS, handleSupabaseError } from "@/lib/api"

const PLAN_LIMITS: Record<string, number> = {
  FREE: 10,
  PLUS: 50,
  PRO: 100,
  MAX: 500,
}

const createFromDropSchema = z.object({
  draggedId: z.string().min(1, "Dragged screenplay ID required"),
  targetId: z.string().min(1, "Target screenplay ID required"),
  projectId: z.string().optional(),
})

type ScreenplayItem = {
  id: string
  title: string
  stackId: string | null
  projectId: string | null
}

type StackScreenplay = {
  id: string
  title: string
  wordCount: number
  updatedAt: string
  type: string | null
}

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
  schema: createFromDropSchema,
  rateLimit: RATE_LIMITS.PROJECT_CREATE,
  handler: async ({ user, data, supabase }) => {
    const { draggedId, targetId, projectId } = data

    if (draggedId === targetId) {
      throw new BadRequestError("Cannot stack a screenplay onto itself")
    }

    const { data: screenplays } = await supabase
      .from("Screenplay")
      .select("id, title, stackId, projectId")
      .in("id", [draggedId, targetId])
      .eq("userId", user.id)

    if (!screenplays || screenplays.length !== 2) {
      throw new ForbiddenError("One or more screenplays not found or access denied")
    }

    const draggedScreenplay = screenplays.find((s: ScreenplayItem) => s.id === draggedId)!
    const targetScreenplay = screenplays.find((s: ScreenplayItem) => s.id === targetId)!

    if (targetScreenplay.stackId) {
      const { data: existingStack } = await supabase
        .from("Stack")
        .select("id")
        .eq("id", targetScreenplay.stackId)
        .eq("userId", user.id)
        .single()

      if (existingStack) {
        await supabase
          .from("Screenplay")
          .update({ stackId: existingStack.id })
          .eq("id", draggedId)

        const updatedStack = await getStackWithScreenplays(existingStack.id, supabase)
        return { stack: updatedStack, action: "added_to_existing" }
      }
    }

    if (draggedScreenplay.stackId) {
      await supabase
        .from("Screenplay")
        .update({ stackId: null })
        .eq("id", draggedId)

      const { count: oldStackCount } = await supabase
        .from("Screenplay")
        .select("*", { count: "exact", head: true })
        .eq("stackId", draggedScreenplay.stackId)

      if ((oldStackCount || 0) <= 1) {
        if (oldStackCount === 1) {
          await supabase
            .from("Screenplay")
            .update({ stackId: null })
            .eq("stackId", draggedScreenplay.stackId)
        }
        await supabase
          .from("Stack")
          .delete()
          .eq("id", draggedScreenplay.stackId)
      }
    }

    const { data: userData } = await supabase
      .from("User")
      .select("plan")
      .eq("id", user.id)
      .single()

    const plan = userData?.plan || "FREE"
    const limit = PLAN_LIMITS[plan]

    const { count: stackCount } = await supabase
      .from("Stack")
      .select("*", { count: "exact", head: true })
      .eq("userId", user.id)

    if ((stackCount || 0) >= limit) {
      throw new ForbiddenError(
        `You've reached the limit of ${limit} stacks on the ${plan} plan. Upgrade to create more.`
      )
    }

    const effectiveProjectId =
      projectId || targetScreenplay.projectId || draggedScreenplay.projectId || null

    const { data: stack, error: createError } = await supabase
      .from("Stack")
      .insert({
        name: `${targetScreenplay.title} Stack`,
        userId: user.id,
        projectId: effectiveProjectId,
      })
      .select("id, name, createdAt, updatedAt, projectId, project:Project(id, name)")
      .single()

    if (createError) handleSupabaseError(createError, "Stack")

    // Connect screenplays to the new stack
    await supabase
      .from("Screenplay")
      .update({ stackId: stack.id })
      .in("id", [draggedId, targetId])

    // Get screenplays for response
    const { data: stackScreenplays } = await supabase
      .from("Screenplay")
      .select("id, title, wordCount, updatedAt, type")
      .eq("stackId", stack.id)
      .order("updatedAt", { ascending: false })

    await supabase.from("Activity").insert({
      userId: user.id,
      type: "stack_created",
      entityId: stack.id,
      entityTitle: stack.name,
      metadata: { screenplayIds: [draggedId, targetId] },
    })

    return {
      stack: {
        ...stack,
        screenplays: stackScreenplays || [],
        _count: { screenplays: stackScreenplays?.length || 0 },
      },
      action: "created_new",
    }
  },
})
