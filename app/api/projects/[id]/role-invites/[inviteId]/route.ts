import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId, inviteId } = params

    const { data: invite, error: fetchError } = await supabase
      .from("ProjectRoleInvite")
      .select(`
        id,
        invitedBy,
        project:Project!projectId(
          userId,
          team:Team(
            members:TeamMember(userId, role)
          )
        )
      `)
      .eq("id", inviteId)
      .eq("projectId", projectId)
      .single()

    if (fetchError?.code === "PGRST116" || !invite) {
      throw new NotFoundError("Invite")
    }
    if (fetchError) throw fetchError

    const project = invite.project as {
      userId: string
      team: { members: { userId: string; role: string }[] } | null
    }

    const isProjectOwner = project.userId === user.id
    const isTeamAdmin = project.team?.members?.some(
      (m) => m.userId === user.id && (m.role === "OWNER" || m.role === "ADMIN")
    )
    const isInviter = invite.invitedBy === user.id

    if (!isProjectOwner && !isTeamAdmin && !isInviter) {
      throw new ForbiddenError("Not authorized to revoke this invite")
    }

    const { error: deleteError } = await supabase
      .from("ProjectRoleInvite")
      .delete()
      .eq("id", inviteId)

    if (deleteError) throw deleteError

    return { success: true }
  },
})
