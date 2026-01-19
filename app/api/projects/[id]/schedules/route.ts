import { z } from "zod"
import { createApiHandler, NotFoundError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { hasProjectAccess, requirePermission } from "@/lib/project-access"

const createScheduleSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
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

    const { data: schedules, error } = await supabase
      .from("Schedule")
      .select("*")
      .eq("projectId", projectId)
      .order("createdAt", { ascending: false })

    if (error) handleSupabaseError(error, "Schedule")

    return schedules
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createScheduleSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    // Require editor permission to create schedules
    await requirePermission(supabase, projectId, user.id, "editor")

    const { data: schedule, error } = await supabase
      .from("Schedule")
      .insert({
        title: data.title,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        data: data.data,
        userId: user.id,
        projectId,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error, "Schedule")

    return schedule
  },
})
