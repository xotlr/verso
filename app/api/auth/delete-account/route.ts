import { z } from "zod"
import { createApiHandler } from "@/lib/api"
import { logger } from "@/lib/logger"

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
})

export const POST = createApiHandler({
  auth: "required",
  schema: deleteAccountSchema,
  handler: async ({ user, data, supabase }) => {
    // Verify the confirmation text matches
    if (data.confirmation !== "DELETE MY ACCOUNT") {
      return { error: "Invalid confirmation", status: 400 }
    }

    logger.info("Account deletion requested", { userId: user.id })

    try {
      // Delete password reset tokens
      await supabase
        .from("PasswordResetToken")
        .delete()
        .eq("email", user.email || "")

      // Delete sessions (NextAuth)
      await supabase
        .from("Session")
        .delete()
        .eq("userId", user.id)

      // Delete accounts (OAuth connections)
      await supabase
        .from("Account")
        .delete()
        .eq("userId", user.id)

      // Delete the user (cascades to screenplays, projects, etc.)
      const { error: deleteError } = await supabase
        .from("User")
        .delete()
        .eq("id", user.id)

      if (deleteError) throw deleteError

      logger.info("Account deleted successfully", { userId: user.id })

      return {
        success: true,
        message: "Your account has been deleted. You will be logged out.",
      }
    } catch (error) {
      logger.error("Failed to delete account", error instanceof Error ? error : undefined, {
        userId: user.id,
      })
      throw error
    }
  },
})
