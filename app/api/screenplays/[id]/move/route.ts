import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { hasProjectAccess } from "@/lib/project-access"

const moveScreenplaySchema = z.object({
  projectId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
})

export const PUT = createApiHandler({
  auth: "required",
  schema: moveScreenplaySchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .select(`
        id, userId, teamId, projectId,
        project:Project(teamId),
        team:Team(id)
      `)
      .eq("id", id)
      .single()

    if (error) handleSupabaseError(error, "Screenplay")
    if (!screenplay) throw new NotFoundError("Screenplay")

    // Only screenplay owner can move it
    if (screenplay.userId !== user.id) {
      throw new ForbiddenError("Only the screenplay owner can move it")
    }

    const { projectId, teamId } = data

    // Validate target project access if moving to a project
    if (projectId) {
      const hasAccess = await hasProjectAccess(supabase, projectId, user.id)
      if (!hasAccess) {
        throw new ForbiddenError("Access denied to target project")
      }
    }

    // Validate target team access if moving to a team
    if (teamId !== undefined && teamId !== null) {
      const { data: membership } = await supabase
        .from("TeamMember")
        .select("id")
        .eq("teamId", teamId)
        .eq("userId", user.id)
        .single()

      if (!membership) {
        throw new ForbiddenError("Access denied to target team")
      }
    }

    // Build update data - only include fields that were provided
    const updateData: { projectId?: string | null; teamId?: string | null } = {}
    if (projectId !== undefined) {
      updateData.projectId = projectId
    }
    if (teamId !== undefined) {
      updateData.teamId = teamId
    }

    const { data: updatedScreenplay, error: updateError } = await supabase
      .from("Screenplay")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        project:Project(id, name),
        team:Team(id, name)
      `)
      .single()

    if (updateError) handleSupabaseError(updateError, "Screenplay")

    return updatedScreenplay
  },
})
