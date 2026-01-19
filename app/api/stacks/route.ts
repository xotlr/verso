import { z } from "zod"
import { createApiHandler, ForbiddenError, RATE_LIMITS, handleSupabaseError } from "@/lib/api"

const PLAN_LIMITS: Record<string, number> = {
  FREE: 10,
  PLUS: 50,
  PRO: 100,
  MAX: 500,
}

const createStackSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  projectId: z.string().optional(),
  screenplayIds: z.array(z.string()).optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    const { data: stacks, error } = await supabase
      .from("Stack")
      .select(`
        id, name, createdAt, updatedAt, projectId,
        project:Project(id, name),
        screenplays:Screenplay(id, title, wordCount, updatedAt, type, genre)
      `)
      .eq("userId", user.id)
      .order("updatedAt", { ascending: false })

    if (error) handleSupabaseError(error, "Stack")

    // Add counts
    type StackData = {
      id: string
      name: string
      createdAt: string
      updatedAt: string
      projectId: string | null
      project: { id: string; name: string } | null
      screenplays: Array<{ id: string; title: string; wordCount: number; updatedAt: string; type: string | null; genre: string | null }>
    }

    const stacksWithCounts = (stacks || []).map((stack: StackData) => ({
      ...stack,
      _count: { screenplays: stack.screenplays?.length || 0 },
    }))

    return stacksWithCounts
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createStackSchema,
  rateLimit: RATE_LIMITS.PROJECT_CREATE,
  handler: async ({ user, data, supabase }) => {
    const { name, projectId, screenplayIds } = data

    // Get user plan
    const { data: userData } = await supabase
      .from("User")
      .select("plan")
      .eq("id", user.id)
      .single()

    const plan = userData?.plan || "FREE"
    const limit = PLAN_LIMITS[plan]

    // Check stack count
    const { count: stackCount } = await supabase
      .from("Stack")
      .select("*", { count: "exact", head: true })
      .eq("userId", user.id)

    if ((stackCount || 0) >= limit) {
      throw new ForbiddenError(
        `You've reached the limit of ${limit} stacks on the ${plan} plan. Upgrade to create more.`
      )
    }

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

    // Verify screenplay access if provided
    if (screenplayIds && screenplayIds.length > 0) {
      const { count: ownedCount } = await supabase
        .from("Screenplay")
        .select("*", { count: "exact", head: true })
        .in("id", screenplayIds)
        .eq("userId", user.id)

      if (ownedCount !== screenplayIds.length) {
        throw new ForbiddenError("One or more screenplays not found or access denied")
      }
    }

    // Create stack
    const { data: stack, error: createError } = await supabase
      .from("Stack")
      .insert({
        name,
        userId: user.id,
        projectId: projectId || null,
      })
      .select(`
        id, name, createdAt, updatedAt, projectId,
        project:Project(id, name)
      `)
      .single()

    if (createError) handleSupabaseError(createError, "Stack")

    // Connect screenplays to stack
    if (screenplayIds && screenplayIds.length > 0) {
      const { error: updateError } = await supabase
        .from("Screenplay")
        .update({ stackId: stack.id })
        .in("id", screenplayIds)

      if (updateError) handleSupabaseError(updateError, "Screenplay")
    }

    // Get screenplays for response
    const { data: screenplays } = await supabase
      .from("Screenplay")
      .select("id, title, wordCount, updatedAt")
      .eq("stackId", stack.id)

    // Log activity
    await supabase.from("Activity").insert({
      userId: user.id,
      type: "stack_created",
      entityId: stack.id,
      entityTitle: stack.name,
    })

    return {
      ...stack,
      screenplays: screenplays || [],
      _count: { screenplays: screenplays?.length || 0 },
    }
  },
})
