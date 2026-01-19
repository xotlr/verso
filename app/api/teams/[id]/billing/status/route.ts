import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { getTeamBillingStatus } from "@/lib/stripe-helpers"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    // Check membership
    const { data: membership } = await supabase
      .from("TeamMember")
      .select("role")
      .eq("teamId", id)
      .eq("userId", user.id)
      .single()

    // Check team exists
    const { data: team, error: teamError } = await supabase
      .from("Team")
      .select("ownerId")
      .eq("id", id)
      .single()

    if (teamError?.code === "PGRST116" || !team) {
      throw new NotFoundError("Team")
    }
    if (teamError) throw teamError

    const isMember = membership || team.ownerId === user.id
    if (!isMember) {
      throw new ForbiddenError("Access denied")
    }

    const billingStatus = await getTeamBillingStatus(id)

    return billingStatus
  },
})
