import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"

interface CallsheetAccessResult {
  allowed: boolean
  notFound: boolean
  callsheet: { id: string; userId: string } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkCallsheetAccess(supabase: any, callsheetId: string, userId: string): Promise<CallsheetAccessResult> {
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

  if (error) handleSupabaseError(error, "Callsheet")
  if (!data) {
    return { allowed: false, notFound: true, callsheet: null }
  }

  // Type the callsheet data - use unknown first due to Supabase nested relation typing
  const callsheet = data as unknown as {
    id: string
    userId: string
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

const createShareLinkSchema = z.object({
  filterType: z.enum(["all", "department", "person"]).default("all"),
  filterValue: z.string().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkCallsheetAccess(supabase, id, user.id)

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

    if (error) handleSupabaseError(error, "Share")

    return { shareLinks: shareLinks || [] }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createShareLinkSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const access = await checkCallsheetAccess(supabase, id, user.id)

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

    if (error) handleSupabaseError(error, "Share")

    return { shareLink }
  },
})
