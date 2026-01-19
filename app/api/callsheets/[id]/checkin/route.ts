import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { createServerActionClient } from "@/lib/supabase/server"

interface CallsheetAccessResult {
  allowed: boolean
  notFound: boolean
  callsheet: { id: string; userId: string } | null
}

async function checkCallsheetAccess(callsheetId: string, userId: string): Promise<CallsheetAccessResult> {
  const supabase = await createServerActionClient()

  const { data, error } = await supabase
    .from("Callsheet")
    .select(`
      id,
      userId,
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

  if (error?.code === "PGRST116" || !data) {
    return { allowed: false, notFound: true, callsheet: null }
  }
  if (error) throw error

  // Type the callsheet data
  const callsheet = data as {
    id: string
    userId: string
    project: {
      id: string
      team: { id: string; members: { userId: string }[] } | null
    }
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

const checkInSchema = z.object({
  crewName: z.string().min(1).max(255),
  department: z.string().min(1).max(100),
  notes: z.string().max(500).optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const { data: checkIns, error } = await supabase
      .from("CrewCheckIn")
      .select("*")
      .eq("callsheetId", id)
      .order("checkedInAt", { ascending: false })

    if (error) throw error

    return { checkIns: checkIns || [] }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: checkInSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    // Check for existing check-in
    const { data: existingCheckIn } = await supabase
      .from("CrewCheckIn")
      .select("id")
      .eq("callsheetId", id)
      .eq("crewName", data.crewName)
      .single()

    const isNewCheckIn = !existingCheckIn
    let checkIn

    if (existingCheckIn) {
      const { data: updated, error: updateError } = await supabase
        .from("CrewCheckIn")
        .update({
          checkedInAt: new Date().toISOString(),
          checkedInBy: user.id,
          notes: data.notes,
        })
        .eq("callsheetId", id)
        .eq("crewName", data.crewName)
        .select()
        .single()

      if (updateError) throw updateError
      checkIn = updated
    } else {
      const { data: created, error: createError } = await supabase
        .from("CrewCheckIn")
        .insert({
          callsheetId: id,
          crewName: data.crewName,
          department: data.department,
          checkedInBy: user.id,
          notes: data.notes,
        })
        .select()
        .single()

      if (createError) throw createError
      checkIn = created
    }

    if (isNewCheckIn && access.callsheet) {
      const callsheetOwnerId = access.callsheet.userId
      if (callsheetOwnerId !== user.id) {
        await supabase.from("Notification").insert({
          userId: callsheetOwnerId,
          type: "checkin",
          title: `${data.crewName} checked in`,
          body: `${data.department}`,
          data: {
            callsheetId: id,
            crewName: data.crewName,
            department: data.department,
          },
        })
      }
    }

    return { checkIn }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, searchParams, supabase }) => {
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const crewName = searchParams.get("crewName")

    if (!crewName) {
      throw new BadRequestError("crewName query parameter required")
    }

    const { error } = await supabase
      .from("CrewCheckIn")
      .delete()
      .eq("callsheetId", id)
      .eq("crewName", crewName)

    if (error) throw error

    return { success: true }
  },
})
