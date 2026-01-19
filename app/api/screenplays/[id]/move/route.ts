import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"

const moveScreenplaySchema = z.object({
  projectId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
})

export const PUT = createApiHandler({
  auth: "required",
  schema: moveScreenplaySchema,
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

    if (error?.code === "PGRST116" || !screenplay) {
      throw new NotFoundError("Screenplay")
    }
    if (error) throw error

    let hasAccess = screenplay.userId === user.id

    if (!hasAccess) {
      const teamId = screenplay.teamId || screenplay.project?.teamId
      if (teamId) {
        const { data: membership } = await supabase
          .from("TeamMember")
          .select("id")
          .eq("teamId", teamId)
          .eq("userId", user.id)
          .single()
        hasAccess = !!membership
      }
    }

    if (!hasAccess) {
      throw new ForbiddenError()
    }

    const { projectId, teamId } = data

    // Validate target project access if moving to a project
    if (projectId) {
      const { data: targetProject, error: projectError } = await supabase
        .from("Project")
        .select("userId, teamId")
        .eq("id", projectId)
        .single()

      if (projectError?.code === "PGRST116" || !targetProject) {
        throw new NotFoundError("Target project")
      }
      if (projectError) throw projectError

      let hasProjectAccess = targetProject.userId === user.id

      if (!hasProjectAccess && targetProject.teamId) {
        const { data: membership } = await supabase
          .from("TeamMember")
          .select("id")
          .eq("teamId", targetProject.teamId)
          .eq("userId", user.id)
          .single()
        hasProjectAccess = !!membership
      }

      if (!hasProjectAccess) {
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

    if (updateError) throw updateError

    return updatedScreenplay
  },
})
