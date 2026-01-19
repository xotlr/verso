import { z } from "zod"
import { createApiHandler, NotFoundError, GoneError, ConflictError } from "@/lib/api"

const requestAccessSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  message: z.string().max(500, "Message too long").optional(),
})

export const POST = createApiHandler({
  auth: "none",
  schema: requestAccessSchema,
  handler: async ({ params, data, supabase }) => {
    const { token } = params
    const { email, name, message } = data

    const { data: shareLink, error } = await supabase
      .from("ShareLink")
      .select(`
        id,
        token,
        isActive,
        expiresAt,
        screenplay:Screenplay!screenplayId(
          id,
          title,
          userId,
          user:User!userId(email, name)
        )
      `)
      .eq("token", token)
      .single()

    if (error || !shareLink) {
      throw new NotFoundError("Share link")
    }

    if (!shareLink.isActive) {
      throw new GoneError("This share link is no longer active")
    }

    if (shareLink.expiresAt && new Date() > new Date(shareLink.expiresAt)) {
      throw new GoneError("This share link has expired")
    }

    // Check for existing request
    const { data: existingRequest } = await supabase
      .from("AccessRequest")
      .select("id, status")
      .eq("shareLinkId", shareLink.id)
      .eq("email", email.toLowerCase())
      .single()

    if (existingRequest) {
      if (existingRequest.status === "APPROVED") {
        throw new ConflictError("Access has already been granted to this email")
      }
      if (existingRequest.status === "PENDING") {
        await supabase
          .from("AccessRequest")
          .update({
            name,
            message,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", existingRequest.id)
        return { success: true, updated: true }
      }
      if (existingRequest.status === "DENIED") {
        await supabase
          .from("AccessRequest")
          .update({
            name,
            message,
            status: "PENDING",
            respondedAt: null,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", existingRequest.id)
        return { success: true, resubmitted: true }
      }
    }

    await supabase
      .from("AccessRequest")
      .insert({
        shareLinkId: shareLink.id,
        email: email.toLowerCase(),
        name,
        message,
      })

    return { success: true }
  },
})
