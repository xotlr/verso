import { createApiHandler, BadRequestError } from "@/lib/api"
import { stripe } from "@/lib/stripe"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    const { data: dbUser, error } = await supabase
      .from("User")
      .select("stripeCustomerId")
      .eq("id", user.id)
      .single()

    if (error) throw error

    if (!dbUser?.stripeCustomerId) {
      throw new BadRequestError("No billing account found")
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/home`,
    })

    return { url: portalSession.url }
  },
})
