import { createApiHandler, NotFoundError, GoneError, ForbiddenError, BadRequestError, UnauthorizedError, handleSupabaseError } from "@/lib/api"

export const GET = createApiHandler({
  auth: "none",
  handler: async ({ params, supabase }) => {
    const { token } = params

    const { data: invite, error } = await supabase
      .from("ProjectRoleInvite")
      .select(`
        id,
        email,
        role,
        expiresAt,
        createdAt,
        project:Project!projectId(
          id,
          name,
          logo,
          banner,
          description
        ),
        inviter:User!invitedBy(
          id,
          name,
          image
        )
      `)
      .eq("token", token)
      .single()

    if (error) handleSupabaseError(error, "Invite")
    if (!invite) throw new NotFoundError("Invite")

    if (new Date() > new Date(invite.expiresAt)) {
      throw new GoneError("Invite has expired")
    }

    return invite
  },
})

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { token } = params

    if (!user.email) {
      throw new UnauthorizedError("Email required")
    }

    const { data: invite, error: fetchError } = await supabase
      .from("ProjectRoleInvite")
      .select(`
        id,
        email,
        role,
        expiresAt,
        projectId,
        project:Project!projectId(
          id,
          name
        )
      `)
      .eq("token", token)
      .single()

    if (fetchError) handleSupabaseError(fetchError, "Invite")
    if (!invite) throw new NotFoundError("Invite")

    if (new Date() > new Date(invite.expiresAt)) {
      await supabase.from("ProjectRoleInvite").delete().eq("id", invite.id)
      throw new GoneError("Invite has expired")
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError("This invite is for a different email address")
    }

    // Check for existing role
    const { data: existingRole } = await supabase
      .from("ProjectRole")
      .select("id")
      .eq("projectId", invite.projectId)
      .eq("role", invite.role)
      .eq("userId", user.id)
      .single()

    if (existingRole) {
      await supabase.from("ProjectRoleInvite").delete().eq("id", invite.id)
      throw new BadRequestError("You already have this role on the project")
    }

    // Create role
    const { data: role, error: createError } = await supabase
      .from("ProjectRole")
      .insert({
        projectId: invite.projectId,
        role: invite.role,
        name: user.name || user.email!,
        userId: user.id,
      })
      .select(`
        id,
        role,
        name,
        userId,
        project:Project!projectId(
          id,
          name
        )
      `)
      .single()

    if (createError) handleSupabaseError(createError, "Invite")

    // Delete invite
    await supabase.from("ProjectRoleInvite").delete().eq("id", invite.id)

    return {
      success: true,
      role,
      project: role.project,
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { token } = params

    if (!user.email) {
      throw new UnauthorizedError("Email required")
    }

    const { data: invite, error: fetchError } = await supabase
      .from("ProjectRoleInvite")
      .select("id, email")
      .eq("token", token)
      .single()

    if (fetchError) handleSupabaseError(fetchError, "Invite")
    if (!invite) throw new NotFoundError("Invite")

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError("This invite is for a different email address")
    }

    const { error: deleteError } = await supabase
      .from("ProjectRoleInvite")
      .delete()
      .eq("id", invite.id)

    if (deleteError) handleSupabaseError(deleteError, "Invite")

    return { success: true }
  },
})
