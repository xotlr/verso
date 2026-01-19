import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError } from "@/lib/api"

const updateShortcutsSchema = z.object({
  shortcuts: z.record(z.string(), z.unknown()),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    const { data: userData, error } = await supabase
      .from("User")
      .select("shortcuts")
      .eq("id", user.id)
      .single()

    if (error?.code === "PGRST116" || !userData) {
      throw new NotFoundError("User")
    }
    if (error) throw error

    return { shortcuts: userData.shortcuts || {} }
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateShortcutsSchema,
  handler: async ({ user, data, supabase }) => {
    const { shortcuts } = data

    if (typeof shortcuts !== "object" || shortcuts === null) {
      throw new BadRequestError("Invalid shortcuts format")
    }

    const { error } = await supabase
      .from("User")
      .update({ shortcuts: shortcuts as object })
      .eq("id", user.id)

    if (error) throw error

    return { success: true }
  },
})
