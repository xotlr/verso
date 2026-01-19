import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"
import type { SupabaseClient } from "@supabase/supabase-js"

interface CallsheetAccessResult {
  allowed: boolean
  notFound: boolean
  callsheet: { id: string; userId: string; status: string; title: string; projectId: string } | null
}

async function checkCallsheetAccess(supabase: SupabaseClient, callsheetId: string, userId: string): Promise<CallsheetAccessResult> {
  const { data, error } = await supabase
    .from("Callsheet")
    .select(`
      id,
      userId,
      status,
      title,
      projectId,
      project:Project!projectId(
        id,
        team:Team(
          id,
          members:TeamMember(userId)
        )
      )
    `)
    .eq("id", callsheetId)
    .single()

  if (error) handleSupabaseError(error, "Callsheet")
  if (!data) {
    return { allowed: false, notFound: true, callsheet: null }
  }

  // Type the callsheet data - use unknown first due to Supabase nested relation typing
  const callsheet = data as unknown as {
    id: string
    userId: string
    status: string
    title: string
    projectId: string
    project: {
      id: string
      team: { id: string; members: { userId: string }[] } | null
    } | null
  }

  if (callsheet.userId === userId) {
    return { allowed: true, notFound: false, callsheet }
  }

  if (callsheet.project?.team && Array.isArray(callsheet.project.team.members)) {
    const isMember = callsheet.project.team.members.some((m) => m.userId === userId)
    if (isMember) {
      return { allowed: true, notFound: false, callsheet }
    }
  }

  return { allowed: false, notFound: false, callsheet: null }
}

const updateCallsheetSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  shootDate: z.string().datetime().optional(),
  callTime: z.string().datetime().optional(),
  wrapTime: z.string().datetime().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED"]).optional(),
  primaryLocation: z.string().max(255).optional().nullable(),
  data: z.any().optional(),
  weatherForecast: z.string().max(255).optional().nullable(),
  weatherTemp: z.number().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkCallsheetAccess(supabase, id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const { data: callsheet, error } = await supabase
      .from("Callsheet")
      .select(`
        *,
        project:Project!projectId(id, name)
      `)
      .eq("id", id)
      .single()

    if (error) handleSupabaseError(error, "Callsheet")

    return callsheet
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateCallsheetSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const access = await checkCallsheetAccess(supabase, id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const previousCallsheet = access.callsheet

    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.shootDate !== undefined) updateData.shootDate = data.shootDate
    if (data.callTime !== undefined) updateData.callTime = data.callTime
    if (data.wrapTime !== undefined) updateData.wrapTime = data.wrapTime
    if (data.status !== undefined) updateData.status = data.status
    if (data.primaryLocation !== undefined) updateData.primaryLocation = data.primaryLocation
    if (data.data !== undefined) updateData.data = data.data
    if (data.weatherForecast !== undefined) updateData.weatherForecast = data.weatherForecast
    if (data.weatherTemp !== undefined) updateData.weatherTemp = data.weatherTemp

    const { data: callsheet, error: updateError } = await supabase
      .from("Callsheet")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        project:Project!projectId(
          id,
          team:Team(
            members:TeamMember(userId)
          )
        )
      `)
      .single()

    if (updateError) handleSupabaseError(updateError, "Callsheet")

    // Send notifications if status changed to PUBLISHED
    if (data.status === "PUBLISHED" && previousCallsheet?.status !== "PUBLISHED") {
      const project = callsheet.project as {
        id: string
        team: { members: { userId: string }[] } | null
      }
      const teamMembers = project?.team?.members || []

      const notificationPromises = teamMembers
        .filter((m) => m.userId !== user.id)
        .map((member) =>
          supabase.from("Notification").insert({
            userId: member.userId,
            type: "callsheet_update",
            title: "Callsheet Published",
            body: `${callsheet.title} is now available`,
            data: {
              callsheetId: callsheet.id,
              projectId: callsheet.projectId,
            },
          })
        )

      await Promise.all(notificationPromises)
    }

    return callsheet
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkCallsheetAccess(supabase, id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const { error } = await supabase
      .from("Callsheet")
      .delete()
      .eq("id", id)

    if (error) handleSupabaseError(error, "Callsheet")

    return { success: true }
  },
})
