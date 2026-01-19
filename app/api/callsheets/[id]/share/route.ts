import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
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

const createShareLinkSchema = z.object({
  filterType: z.enum(["all", "department", "person"]).default("all"),
  filterValue: z.string().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
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

    const { data: shareLinks, error } = await supabase
      .from("CallsheetShareLink")
      .select(`
        *,
        user:User!userId(name)
      `)
      .eq("callsheetId", id)
      .order("createdAt", { ascending: false })

    if (error) throw error

    return { shareLinks: shareLinks || [] }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createShareLinkSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const { data: shareLink, error } = await supabase
      .from("CallsheetShareLink")
      .insert({
        callsheetId: id,
        userId: user.id,
        filterType: data.filterType,
        filterValue: data.filterValue || null,
        expiresAt: data.expiresAt || null,
      })
      .select()
      .single()

    if (error) throw error

    return { shareLink }
  },
})
