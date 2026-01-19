import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError, handleSupabaseError } from "@/lib/api"

const updateConnectionSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateConnectionSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: connectionId } = params
    const { status } = data

    const { data: connection, error: fetchError } = await supabase
      .from("Connection")
      .select("*")
      .eq("id", connectionId)
      .single()

    if (fetchError?.code === "PGRST116" || !connection) {
      throw new NotFoundError("Connection")
    }
    if (fetchError) handleSupabaseError(fetchError, "Connection")

    if (connection.addresseeId !== user.id) {
      throw new ForbiddenError("Only the recipient can respond to this request")
    }

    if (connection.status !== "PENDING") {
      throw new BadRequestError("This request has already been processed")
    }

    const { data: updated, error: updateError } = await supabase
      .from("Connection")
      .update({ status })
      .eq("id", connectionId)
      .select()
      .single()

    if (updateError) handleSupabaseError(updateError, "Connection")

    return {
      connection: updated,
      message: status === "ACCEPTED" ? "Connection accepted" : "Connection declined",
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: connectionId } = params

    const { data: connection, error: fetchError } = await supabase
      .from("Connection")
      .select("*")
      .eq("id", connectionId)
      .single()

    if (fetchError?.code === "PGRST116" || !connection) {
      throw new NotFoundError("Connection")
    }
    if (fetchError) handleSupabaseError(fetchError, "Connection")

    if (connection.requesterId !== user.id && connection.addresseeId !== user.id) {
      throw new ForbiddenError()
    }

    const { error: deleteError } = await supabase
      .from("Connection")
      .delete()
      .eq("id", connectionId)

    if (deleteError) handleSupabaseError(deleteError, "Connection")

    return {
      message: connection.status === "PENDING" ? "Request cancelled" : "Connection removed",
    }
  },
})
