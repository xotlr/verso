import { z } from "zod"
import { createApiHandler } from "@/lib/api"
import { logger } from "@/lib/logger"

const logGreetingSchema = z.object({
  category: z.string().min(1, "Category is required"),
  text: z.string().min(1, "Greeting text is required"),
})

export const POST = createApiHandler({
  auth: "required",
  schema: logGreetingSchema,
  handler: async ({ user, data, supabase }) => {
    const { category, text } = data

    try {
      await supabase.from("GreetingHistory").insert({
        userId: user.id,
        category,
        text,
      })

      // Get old greetings to delete (keep only 20 most recent)
      const { data: oldGreetings } = await supabase
        .from("GreetingHistory")
        .select("id")
        .eq("userId", user.id)
        .order("shownAt", { ascending: false })
        .range(20, 1000)

      if (oldGreetings && oldGreetings.length > 0) {
        await supabase
          .from("GreetingHistory")
          .delete()
          .in("id", oldGreetings.map((g: { id: string }) => g.id))
      }
    } catch (error) {
      logger.error("Failed to log greeting", error instanceof Error ? error : undefined, {
        userId: user.id,
      })
    }

    return { success: true }
  },
})
