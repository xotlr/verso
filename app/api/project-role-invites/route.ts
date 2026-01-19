import { createApiHandler, UnauthorizedError } from "@/lib/api"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    if (!user.email) {
      throw new UnauthorizedError("Email required")
    }

    const { data: invites, error } = await supabase
      .from("ProjectRoleInvite")
      .select(`
        id,
        email,
        role,
        token,
        expiresAt,
        createdAt,
        project:Project!projectId(
          id,
          name,
          logo,
          banner
        ),
        inviter:User!invitedBy(
          id,
          name,
          image
        )
      `)
      .eq("email", user.email.toLowerCase())
      .gt("expiresAt", new Date().toISOString())
      .order("createdAt", { ascending: false })

    if (error) throw error

    return invites || []
  },
})
