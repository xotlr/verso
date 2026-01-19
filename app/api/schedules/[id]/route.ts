import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"

async function checkScheduleAccess(scheduleId: string, userId: string, supabase: any) {
  const { data: schedule, error } = await supabase
    .from("Schedule")
    .select(`
      *,
      project:Project(
        id, userId, teamId,
        team:Team(id, members:TeamMember(userId))
      )
    `)
    .eq("id", scheduleId)
    .single()

  if (error?.code === "PGRST116" || !schedule) {
    return { allowed: false, notFound: true, schedule: null }
  }
  if (error) throw error

  if (schedule.userId === userId) {
    return { allowed: true, notFound: false, schedule }
  }

  if (schedule.project?.team?.members?.some((m: { userId: string }) => m.userId === userId)) {
    return { allowed: true, notFound: false, schedule }
  }

  return { allowed: false, notFound: false, schedule: null }
}

const updateScheduleSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  data: z.any().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkScheduleAccess(id, user.id, supabase)

    if (access.notFound) {
      throw new NotFoundError("Schedule")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    return access.schedule
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateScheduleSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const access = await checkScheduleAccess(id, user.id, supabase)

    if (access.notFound) {
      throw new NotFoundError("Schedule")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.startDate !== undefined) updateData.startDate = data.startDate || null
    if (data.endDate !== undefined) updateData.endDate = data.endDate || null
    if (data.data !== undefined) updateData.data = data.data

    const { data: schedule, error } = await supabase
      .from("Schedule")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return schedule
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkScheduleAccess(id, user.id, supabase)

    if (access.notFound) {
      throw new NotFoundError("Schedule")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const { error } = await supabase
      .from("Schedule")
      .delete()
      .eq("id", id)

    if (error) throw error

    return { success: true }
  },
})
