import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError, handleSupabaseError } from "@/lib/api"
import { createTeamPortalSession } from "@/lib/stripe-helpers"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params, request, supabase }) => {
    const { id } = params

    // Get team
    const { data: team, error: teamError } = await supabase
      .from("Team")
      .select("id, ownerId, stripeCustomerId")
      .eq("id", id)
      .single()

    if (teamError?.code === "PGRST116" || !team) {
      throw new NotFoundError("Team")
    }
    if (teamError) handleSupabaseError(teamError, "Team")

    if (team.ownerId !== user.id) {
      throw new ForbiddenError("Only the team owner can access billing")
    }

    if (!team.stripeCustomerId) {
      throw new BadRequestError("No billing account found. Subscribe to a plan first.")
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"
    const returnUrl = `${origin}/teams/${team.id}/settings?tab=billing`

    const portalSession = await createTeamPortalSession(team.id, returnUrl)

    return { url: portalSession.url }
  },
})
